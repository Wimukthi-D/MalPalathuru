import { Component, computed, inject, OnDestroy, OnInit, signal } from "@angular/core";
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from "@angular/forms";
import { Observable } from "rxjs";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";

import { RoomApiService } from "../../core/services/room-api.service";
import { RoomStateService } from "../../core/services/room-state.service";
import {
  AnswerFieldKey,
  AnswerResponse,
  LeaderboardEntryResponse,
  LeaderboardResponse,
  ReviewDecision,
  ReviewItemResponse,
  ReviewStateResponse,
  ReviewVote,
  Room,
  RoundResponse,
  TimerResponse,
  VoteResponse
} from "../../core/models/room.models";
import { Player } from "../../core/models/player.model";
import { RoomSocketService, RoomSocketTopic } from "../../core/services/room-socket.service";
import { RoomEvent, RoomEventType } from "../../core/models/room-event.model";
import { SubmitAnswersRequest } from "../../core/room-request.model";

interface AnswerFieldOption {
  key: AnswerFieldKey;
  label: string;
  icon: string;
}

interface ReviewGridCell {
  field: AnswerFieldKey;
  label: string;
  answerId: number | null;
  value: string;
  decision: string | null;
  score: number | null;
  votes: VoteResponse[];
}

interface ReviewGridRow {
  player: Player;
  cells: ReviewGridCell[];
}

interface LeaderboardRow {
  rank: number;
  playerId: number | null;
  playerName: string;
  roundScore: number;
  totalScore: number;
}

type ApiActionResponse = Room | RoomEvent | RoundResponse | ReviewStateResponse | LeaderboardResponse | null;

@Component({
  selector: 'app-lobby',
  imports: [
    RouterLink,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './lobby.html',
  styleUrl: './lobby.scss'
})
export class Lobby implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly roomApiService = inject(RoomApiService);
  private readonly roomSocketService = inject(RoomSocketService);
  private readonly roomStateService = inject(RoomStateService);
  private timerHandle: ReturnType<typeof setInterval> | null = null;
  private answerDirty = false;

  readonly answerFields: AnswerFieldOption[] = [
    { key: 'female', label: 'Female', icon: 'woman' },
    { key: 'male', label: 'Male', icon: 'man' },
    { key: 'flower', label: 'Flower', icon: 'local_florist' },
    { key: 'fruit', label: 'Fruit', icon: 'restaurant' },
    { key: 'animal', label: 'Animal', icon: 'pets' },
    { key: 'city', label: 'City', icon: 'location_city' }
  ];
  readonly alphabet = Array.from({ length: 26 }, (_, index) => String.fromCharCode(65 + index));

  room = signal<Room | null>(null);
  timer = signal<TimerResponse | null>(null);
  timerRemaining = signal<number | null>(null);
  reviewState = signal<ReviewStateResponse | null>(null);
  leaderboard = signal<LeaderboardResponse | null>(null);

  currentPlayerId = signal<number | null>(null);
  currentPlayerName = signal<string | null>(null);
  isHost = signal(false);
  socketConnected = signal(false);
  roundLockedByEvent = signal(false);

  loading = signal(false);
  actionLoading = signal(false);
  errorMessage = signal<string | null>(null);
  copied = signal(false);
  submittedAnswers = signal(false);
  closedMessage = signal<string | null>(null);

  answerForm: Record<AnswerFieldKey, string> = {
    female: '',
    male: '',
    flower: '',
    fruit: '',
    animal: '',
    city: ''
  };

  playerCount = computed(() => this.room()?.players.length ?? 0);
  isLobbyStatus = computed(() => this.room()?.status === 'LOBBY');
  isClosed = computed(() => this.room()?.status === 'CLOSED' || Boolean(this.closedMessage()));
  isFinished = computed(() => this.room()?.status === 'FINISHED' || Boolean(this.leaderboard()?.final));
  isReviewing = computed(() => this.room()?.status === 'REVIEWING' || Boolean(this.reviewState()));
  isLeaderboardStatus = computed(() => this.room()?.status === 'ROUND_LEADERBOARD' || Boolean(this.leaderboard()));
  canStartGame = computed(() => this.isHost() && this.isLobbyStatus() && this.playerCount() >= 2);

  currentPlayer = computed(() => {
    const room = this.room();
    const playerId = this.currentPlayerId();

    if (!room || !playerId) {
      return null;
    }

    return room.players.find((player) => player.id === playerId) ?? null;
  });

  currentRound = computed(() => this.findCurrentRound(this.room()));
  currentRoundId = computed(() => this.currentRound()?.id ?? null);
  selectedLetter = computed(() => this.findSelectedLetter(this.room(), this.currentRound()));
  usedLetters = computed(() => this.findUsedLetters(this.room(), this.currentRound()));
  currentSuggester = computed(() => this.findSuggester(this.room(), this.currentRound()));
  isCurrentSuggester = computed(() => {
    const suggester = this.currentSuggester();
    const playerId = this.currentPlayerId();
    return Boolean(suggester && playerId && suggester.id === playerId);
  });
  isRoundLocked = computed(() => {
    const roomStatus = this.room()?.status;
    const round = this.currentRound();
    const roundStatus = round?.status;

    return this.roundLockedByEvent()
      || Boolean(round?.locked)
      || roomStatus === 'REVIEWING'
      || roomStatus === 'ROUND_LEADERBOARD'
      || roomStatus === 'FINISHED'
      || roundStatus === 'LOCKED'
      || roundStatus === 'ROUND_LOCKED'
      || roundStatus === 'REVIEWING'
      || roundStatus === 'ROUND_LEADERBOARD'
      || roundStatus === 'COMPLETED'
      || roundStatus === 'FINISHED';
  });
  isLetterSelection = computed(() => {
    const status = this.room()?.status;
    return status === 'LETTER_SELECTION' || Boolean(this.currentRound() && !this.selectedLetter() && !this.isRoundLocked());
  });
  isAnswerPhase = computed(() => Boolean(
    this.selectedLetter()
    && !this.isLobbyStatus()
    && !this.isReviewing()
    && !this.isLeaderboardStatus()
    && !this.isFinished()
    && !this.isClosed()
  ));
  canEditAnswers = computed(() => this.isAnswerPhase() && !this.isRoundLocked() && !this.actionLoading());
  canStartReview = computed(() => this.isHost() && this.isRoundLocked() && !this.isReviewing() && !this.isLeaderboardStatus() && !this.isFinished());
  currentReviewItem = computed(() => this.findCurrentReviewItem(this.reviewState()));
  currentReviewAnswerId = computed(() => this.answerId(this.currentReviewItem()));
  reviewRows = computed(() => this.buildReviewRows());
  leaderboardRows = computed(() => this.buildLeaderboardRows());

  ngOnInit(): void {
    const roomCodeFromRoute = this.route.snapshot.paramMap.get('roomCode');

    this.currentPlayerId.set(this.roomStateService.getStoredPlayerId());
    this.currentPlayerName.set(this.roomStateService.getStoredPlayerName());
    this.isHost.set(this.roomStateService.isStoredHost());

    if (!roomCodeFromRoute) {
      this.errorMessage.set('Room code is missing');
      return;
    }

    this.loadRoom(roomCodeFromRoute);
    this.connectRoomSocket(roomCodeFromRoute);
  }

  ngOnDestroy(): void {
    this.stopTimerDisplay(false);
    this.roomSocketService.disconnect();
  }

  loadRoom(roomCode: string): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.roomApiService.getRoomByCode(roomCode).subscribe({
      next: (room) => {
        this.updateRoomState(room);
        this.loading.set(false);
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.loading.set(false);
      }
    });
  }

  connectRoomSocket(roomCode: string): void {
    this.socketConnected.set(false);
    this.roomSocketService.connectToRoom(
      roomCode,
      (event, topic) => this.handleRoomEvent(event, topic),
      () => this.socketConnected.set(true),
      (message) => this.errorMessage.set(message)
    );
  }

  handleRoomEvent(event: RoomEvent, topic: RoomSocketTopic): void {
    const eventType = this.eventType(event);

    if (eventType === 'ROOM_CLOSED') {
      this.handleRoomClosed(event.message || 'This room has been closed.');
      return;
    }

    if (eventType === 'PLAYER_KICKED') {
      this.handleKickEvent(event);
      return;
    }

    this.applyEventPayload(event, topic);

    if (eventType === 'COUNTDOWN_STARTED') {
      this.startTimerDisplay(this.extractTimer(event));
    }

    if (eventType === 'ROUND_LOCKED') {
      this.roundLockedByEvent.set(true);
      this.stopTimerDisplay(false);
      this.timerRemaining.set(0);
    }

    if (eventType === 'GAME_STARTED' || eventType === 'ROUND_STARTED' || eventType === 'NEXT_ROUND_STARTED') {
      this.resetRoundUi();
    }

    if (eventType === 'FINAL_LEADERBOARD_READY') {
      const leaderboard = this.extractLeaderboard(event);
      if (leaderboard) {
        this.leaderboard.set({ ...leaderboard, final: true });
      }
    }

    if (eventType === 'ROUND_SCORE_READY' || eventType === 'FINAL_LEADERBOARD_READY') {
      this.reviewState.set(null);
    }
  }

  handleKickEvent(event: RoomEvent): void {
    const currentPlayerId = this.currentPlayerId();

    if (event.affectedPlayerId === currentPlayerId) {
      this.roomSocketService.disconnect();
      this.roomStateService.clearRoom();
      this.roomStateService.setNotice('You were removed from the room by the host.');
      this.router.navigate(['/']);
      return;
    }

    this.applyEventPayload(event, 'state');
  }

  handleRoomClosed(message = 'The room has been closed.'): void {
    this.stopTimerDisplay(false);
    this.socketConnected.set(false);
    this.closedMessage.set(message);
    this.roomSocketService.disconnect();
    this.roomStateService.clearRoom();
    this.roomStateService.setNotice(message);
    this.router.navigate(['/']);
  }

  updateRoomState(room: Room): void {
    this.room.set(room);
    this.roomStateService.setRoom(room);
    this.hydrateGameStateFromRoom(room);

    const currentPlayerId = this.currentPlayerId();
    const currentPlayer = room.players.find((player) => player.id === currentPlayerId);

    if (currentPlayer) {
      this.currentPlayerName.set(currentPlayer.playerName);
      this.isHost.set(currentPlayer.host);
      this.roomStateService.setCurrentPlayer(currentPlayer);
    }
  }

  copyRoomCode(): void {
    const roomCode = this.room()?.roomCode;

    if (!roomCode) {
      return;
    }

    navigator.clipboard.writeText(roomCode).then(() => {
      this.copied.set(true);

      setTimeout(() => {
        this.copied.set(false);
      }, 1500);
    });
  }

  refreshLobby(): void {
    const roomCode = this.room()?.roomCode;

    if (!roomCode) {
      return;
    }

    this.loadRoom(roomCode);
  }

  leaveLobby(): void {
    const room = this.room();
    const player = this.currentPlayer();

    if (!room || !player) {
      this.roomSocketService.disconnect();
      this.roomStateService.clearRoom();
      this.router.navigate(['/']);
      return;
    }

    if (player.host) {
      this.closeRoom(true);
      return;
    }

    this.actionLoading.set(true);
    this.errorMessage.set(null);

    this.roomApiService
      .leavePlayer(room.roomCode, player.id)
      .subscribe({
        next: () => {
          this.actionLoading.set(false);
          this.roomSocketService.disconnect();
          this.roomStateService.clearRoom();
          this.router.navigate(['/']);
        },
        error: (error: Error) => {
          this.errorMessage.set(error.message);
          this.actionLoading.set(false);
        }
      });
  }

  toggleReady(): void {
    const room = this.room();
    const player = this.currentPlayer();

    if (!room || !player || !this.isLobbyStatus()) {
      return;
    }

    this.runAction(this.roomApiService.toggleReady(room.roomCode, player.id));
  }

  lockOrUnlockRoom(): void {
    const room = this.room();
    const hostPlayer = this.currentPlayer();

    if (!room || !hostPlayer?.host || !this.isLobbyStatus()) {
      return;
    }

    const request$ = room.locked
      ? this.roomApiService.unlockRoom(room.roomCode, hostPlayer.id)
      : this.roomApiService.lockRoom(room.roomCode, hostPlayer.id);

    this.runAction(request$);
  }

  kickPlayer(player: Player): void {
    const room = this.room();
    const hostPlayer = this.currentPlayer();

    if (!room || !hostPlayer?.host || !this.isLobbyStatus()) {
      return;
    }

    if (!confirm(`Remove ${player.playerName} from this room?`)) {
      return;
    }

    this.runAction(this.roomApiService.kickPlayer(room.roomCode, player.id, hostPlayer.id));
  }

  startGame(): void {
    const room = this.room();
    const hostPlayer = this.currentPlayer();

    if (!room || !hostPlayer?.host || !this.canStartGame()) {
      return;
    }

    this.runAction(this.roomApiService.startGame(room.roomCode, hostPlayer.id), () => this.resetRoundUi());
  }

  canSelectLetter(letter: string): boolean {
    return this.isCurrentSuggester()
      && !this.selectedLetter()
      && !this.usedLetters().includes(letter)
      && !this.actionLoading()
      && !this.isClosed();
  }

  selectLetter(letter: string): void {
    const room = this.room();
    const playerId = this.currentPlayerId();
    const roundId = this.currentRoundId();

    if (!room || !playerId || !roundId || !this.canSelectLetter(letter)) {
      return;
    }

    this.runAction(this.roomApiService.selectLetter(room.roomCode, roundId, { playerId, letter }));
  }

  markAnswerDirty(): void {
    this.answerDirty = true;
  }

  submitAnswers(): void {
    const room = this.room();
    const roundId = this.currentRoundId();
    const playerId = this.currentPlayerId();

    if (!room || !roundId || !playerId || !this.canEditAnswers()) {
      return;
    }

    const request: SubmitAnswersRequest = {
      playerId,
      female: this.answerForm.female.trim(),
      male: this.answerForm.male.trim(),
      flower: this.answerForm.flower.trim(),
      fruit: this.answerForm.fruit.trim(),
      animal: this.answerForm.animal.trim(),
      city: this.answerForm.city.trim()
    };

    this.runAction(
      this.roomApiService.submitAnswers(room.roomCode, roundId, request),
      () => {
        this.submittedAnswers.set(true);
        this.answerDirty = false;
      }
    );
  }

  lockRound(): void {
    const room = this.room();
    const roundId = this.currentRoundId();

    if (!room || !roundId || this.isRoundLocked()) {
      return;
    }

    this.runAction(
      this.roomApiService.lockRound(room.roomCode, roundId),
      () => {
        this.roundLockedByEvent.set(true);
        this.stopTimerDisplay(false);
        this.timerRemaining.set(0);
      }
    );
  }

  startReview(): void {
    const room = this.room();
    const roundId = this.currentRoundId();
    const hostPlayer = this.currentPlayer();

    if (!room || !roundId || !hostPlayer?.host || !this.canStartReview()) {
      return;
    }

    this.runAction(this.roomApiService.startReview(room.roomCode, roundId, hostPlayer.id));
  }

  voteOnCurrentAnswer(vote: ReviewVote): void {
    const room = this.room();
    const roundId = this.currentRoundId();
    const playerId = this.currentPlayerId();
    const answerId = this.currentReviewAnswerId();

    if (!room || !roundId || !playerId || !answerId) {
      return;
    }

    this.runAction(this.roomApiService.voteOnAnswer(room.roomCode, roundId, { playerId, answerId, vote }));
  }

  decideCurrentAnswer(decision: Exclude<ReviewDecision, 'PENDING'>): void {
    const room = this.room();
    const roundId = this.currentRoundId();
    const hostPlayer = this.currentPlayer();
    const answerId = this.currentReviewAnswerId();

    if (!room || !roundId || !hostPlayer?.host || !answerId) {
      return;
    }

    this.runAction(this.roomApiService.decideAnswer(room.roomCode, roundId, hostPlayer.id, { answerId, decision }));
  }

  completeReview(): void {
    const room = this.room();
    const roundId = this.currentRoundId();
    const hostPlayer = this.currentPlayer();

    if (!room || !roundId || !hostPlayer?.host) {
      return;
    }

    this.runAction(this.roomApiService.completeReview(room.roomCode, roundId, hostPlayer.id));
  }

  nextRound(): void {
    const room = this.room();
    const roundId = this.currentRoundId();
    const hostPlayer = this.currentPlayer();

    if (!room || !roundId || !hostPlayer?.host || this.isFinished()) {
      return;
    }

    this.runAction(
      this.roomApiService.nextRound(room.roomCode, roundId, hostPlayer.id),
      () => this.resetRoundUi()
    );
  }

  closeRoom(confirmFirst = true): void {
    const room = this.room();
    const hostPlayer = this.currentPlayer();

    if (!room || !hostPlayer?.host) {
      return;
    }

    if (confirmFirst && !confirm('Close this room for everyone?')) {
      return;
    }

    this.runAction(
      this.roomApiService.closeRoom(room.roomCode, hostPlayer.id),
      (response) => {
        this.applyApiResponse(response);
        this.handleRoomClosed('The room was closed.');
      }
    );
  }

  playerReady(player: Player): boolean {
    return Boolean(player.ready);
  }

  playerScore(player: Player): number {
    return player.totalScore ?? 0;
  }

  roundNumber(round: RoundResponse | null): number {
    return round?.roundNumber ?? round?.number ?? 1;
  }

  answerValue(item: AnswerResponse | null | undefined, field: AnswerFieldKey): string {
    if (!item) {
      return '';
    }

    const directValue = item[field];
    if (typeof directValue === 'string') {
      return directValue;
    }

    return item.value ?? item.answer ?? '';
  }

  reviewItemFieldLabel(item: AnswerResponse | null | undefined): string {
    const field = this.normalizedCategory(item);
    return this.answerFields.find((answerField) => answerField.key === field)?.label ?? 'Answer';
  }

  reviewItemPlayerName(item: AnswerResponse | null | undefined): string {
    if (!item) {
      return 'Waiting';
    }

    if (item.playerName) {
      return item.playerName;
    }

    const player = this.room()?.players.find((roomPlayer) => roomPlayer.id === item.playerId);
    return player?.playerName ?? 'Unknown player';
  }

  reviewItemValue(item: AnswerResponse | null | undefined): string {
    const field = this.normalizedCategory(item) ?? 'female';
    return this.answerValue(item, field);
  }

  formatVotes(votes: VoteResponse[] | null | undefined): string {
    const acceptCount = votes?.filter((vote) => vote.vote === 'ACCEPT').length ?? 0;
    const rejectCount = votes?.filter((vote) => vote.vote === 'REJECT').length ?? 0;
    return `${acceptCount} accept / ${rejectCount} reject`;
  }

  isCurrentReviewAnswer(answerId: number | null): boolean {
    return Boolean(answerId && this.currentReviewAnswerId() === answerId);
  }

  private runAction(
    request$: Observable<ApiActionResponse>,
    onSuccess?: (response: ApiActionResponse) => void
  ): void {
    this.actionLoading.set(true);
    this.errorMessage.set(null);

    request$.subscribe({
      next: (response) => {
        this.applyApiResponse(response);
        onSuccess?.(response);
        this.actionLoading.set(false);
      },
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.actionLoading.set(false);
      }
    });
  }

  private applyEventPayload(event: RoomEvent, topic: RoomSocketTopic): void {
    const room = this.extractRoom(event);
    const round = this.extractRound(event);
    const timer = this.extractTimer(event);
    const review = this.extractReview(event);
    const leaderboard = this.extractLeaderboard(event);

    if (room) {
      this.updateRoomState(room);
    } else if (round) {
      this.mergeRoundState(round);
    }

    if (topic === 'timer' && timer) {
      this.startTimerDisplay(timer);
    }

    if ((topic === 'review' || review) && review) {
      this.reviewState.set(review);
    }

    if ((topic === 'leaderboard' || leaderboard) && leaderboard) {
      this.reviewState.set(null);
      this.leaderboard.set(leaderboard);
    }
  }

  private applyApiResponse(response: ApiActionResponse): void {
    if (!response) {
      return;
    }

    if (this.isRoomResponse(response)) {
      this.updateRoomState(response);
      return;
    }

    if (this.isRoundResponse(response)) {
      this.mergeRoundState(response);
      return;
    }

    const record = response as Record<string, unknown>;

    if (record['type'] || record['eventType'] || record['payload'] || record['room']) {
      this.handleRoomEvent(response as RoomEvent, 'state');
      return;
    }

    if (record['currentAnswer'] || record['currentItem'] || record['items']) {
      this.reviewState.set(response as ReviewStateResponse);
      return;
    }

    if (record['entries'] || record['rankings']) {
      this.leaderboard.set(response as LeaderboardResponse);
    }
  }

  private hydrateGameStateFromRoom(room: Room): void {
    if (room.reviewState) {
      this.reviewState.set(room.reviewState);
    }

    if (room.leaderboard) {
      this.leaderboard.set(room.leaderboard);
    }

    const round = this.findCurrentRound(room);
    if (round?.startedAt || round?.expiresAt) {
      this.startTimerDisplay({
        roundId: round.id,
        startedAt: round.startedAt,
        expiresAt: round.expiresAt,
        countLimitSeconds: round.countLimitSeconds ?? room.countLimitSeconds
      });
    }

    if (round && !this.answerDirty) {
      this.hydrateOwnAnswers(round);
    }
  }

  private hydrateOwnAnswers(round: RoundResponse): void {
    const playerId = this.currentPlayerId();
    if (!playerId) {
      return;
    }

    const answers = this.collectAnswers(round, this.reviewState());
    let hasAnyAnswer = false;

    this.answerFields.forEach((field) => {
      const item = this.findAnswerForPlayerField(answers, playerId, undefined, field.key);
      const value = this.answerValue(item, field.key);
      if (value) {
        this.answerForm[field.key] = value;
        hasAnyAnswer = true;
      }
    });

    this.submittedAnswers.set(hasAnyAnswer);
  }

  private resetRoundUi(): void {
    this.answerDirty = false;
    this.submittedAnswers.set(false);
    this.roundLockedByEvent.set(false);
    this.reviewState.set(null);
    this.leaderboard.set(null);
    this.stopTimerDisplay(true);

    this.answerFields.forEach((field) => {
      this.answerForm[field.key] = '';
    });
  }

  private findCurrentRound(room: Room | null): RoundResponse | null {
    if (!room) {
      return null;
    }

    if (room.currentRound) {
      return room.currentRound;
    }

    if (room.round) {
      return room.round;
    }

    const rounds = room.rounds ?? [];
    return rounds.find((round) => {
      const status = round.status;
      return status !== 'COMPLETED' && status !== 'FINISHED';
    }) ?? rounds.at(-1) ?? null;
  }

  private findSelectedLetter(room: Room | null, round: RoundResponse | null): string | null {
    const selectedLetter = round?.selectedLetter ?? round?.letter ?? room?.selectedLetter ?? null;
    return selectedLetter ? selectedLetter.toUpperCase() : null;
  }

  private findUsedLetters(room: Room | null, round: RoundResponse | null): string[] {
    const letters = round?.usedLetters
      ?? room?.usedLetters
      ?? room?.rounds
        ?.map((knownRound) => knownRound.selectedLetter ?? knownRound.letter)
        .filter((letter): letter is string => Boolean(letter))
      ?? [];

    return [...new Set(letters.map((letter) => letter.toUpperCase()))];
  }

  private findSuggester(room: Room | null, round: RoundResponse | null): Player | null {
    if (!room || !round) {
      return null;
    }

    if (round.suggester) {
      return round.suggester;
    }

    const suggesterId = round.suggesterPlayerId
      ?? round.suggestedByPlayerId
      ?? round.currentSuggesterPlayerId
      ?? room.currentSuggesterPlayerId
      ?? null;

    return room.players.find((player) => player.id === suggesterId) ?? null;
  }

  private findCurrentReviewItem(review: ReviewStateResponse | null): ReviewItemResponse | null {
    if (!review) {
      return null;
    }

    if (review.currentItem) {
      return review.currentItem;
    }

    if (review.currentAnswer) {
      return review.currentAnswer;
    }

    const items = review.items ?? review.answers ?? [];
    if (review.currentAnswerId) {
      return items.find((item) => this.answerId(item) === review.currentAnswerId) ?? null;
    }

    if (typeof review.currentIndex === 'number') {
      return items[review.currentIndex] ?? null;
    }

    return items[0] ?? null;
  }

  private buildReviewRows(): ReviewGridRow[] {
    const room = this.room();
    const round = this.currentRound();
    const review = this.reviewState();

    if (!room) {
      return [];
    }

    const answers = this.collectAnswers(round, review);

    return room.players.map((player) => ({
      player,
      cells: this.answerFields.map((field) => {
        const item = this.findAnswerForPlayerField(answers, player.id, player.playerName, field.key);

        return {
          field: field.key,
          label: field.label,
          answerId: this.answerId(item),
          value: this.answerValue(item, field.key),
          decision: item?.decision ?? null,
          score: typeof item?.score === 'number' ? item.score : null,
          votes: item?.votes ?? []
        };
      })
    }));
  }

  private buildLeaderboardRows(): LeaderboardRow[] {
    const leaderboard = this.leaderboard();
    const room = this.room();
    const source = leaderboard?.entries ?? leaderboard?.rankings ?? leaderboard?.players;

    if (source?.length) {
      return source.map((entry, index) => this.toLeaderboardRow(entry, index));
    }

    return room?.players
      .map((player, index) => ({
        rank: index + 1,
        playerId: player.id,
        playerName: player.playerName,
        roundScore: player.roundScore ?? 0,
        totalScore: player.totalScore ?? 0
      }))
      .sort((first, second) => second.totalScore - first.totalScore)
      .map((entry, index) => ({ ...entry, rank: index + 1 })) ?? [];
  }

  private toLeaderboardRow(entry: LeaderboardEntryResponse, index: number): LeaderboardRow {
    const player = this.room()?.players.find((roomPlayer) => roomPlayer.id === entry.playerId);
    const playerName = entry.playerName ?? player?.playerName ?? 'Unknown player';
    const totalScore = entry.totalScore ?? player?.totalScore ?? entry.score ?? 0;

    return {
      rank: entry.rank ?? index + 1,
      playerId: entry.playerId ?? player?.id ?? null,
      playerName,
      roundScore: entry.roundScore ?? entry.score ?? 0,
      totalScore
    };
  }

  private collectAnswers(round: RoundResponse | null, review: ReviewStateResponse | null): AnswerResponse[] {
    const answers: AnswerResponse[] = [];
    const append = (items: AnswerResponse[] | undefined) => {
      items?.forEach((item) => answers.push(item));
    };

    append(round?.answers);
    append(round?.answerSheets);
    append(round?.submittedAnswers);
    append(review?.answers);
    append(review?.items);

    if (review?.currentAnswer) {
      answers.push(review.currentAnswer);
    }

    if (review?.currentItem) {
      answers.push(review.currentItem);
    }

    const seen = new Set<string>();
    return answers.filter((answer) => {
      const key = [
        this.answerId(answer),
        answer.playerId,
        answer.playerName,
        this.normalizedCategory(answer),
        answer.value,
        answer.answer
      ].join(':');

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }

  private findAnswerForPlayerField(
    answers: AnswerResponse[],
    playerId: number,
    playerName: string | undefined,
    field: AnswerFieldKey
  ): AnswerResponse | null {
    const fieldAnswer = answers.find((answer) => {
      const samePlayer = answer.playerId === playerId || Boolean(playerName && answer.playerName === playerName);
      return samePlayer && this.normalizedCategory(answer) === field;
    });

    if (fieldAnswer) {
      return fieldAnswer;
    }

    return answers.find((answer) => {
      const samePlayer = answer.playerId === playerId || Boolean(playerName && answer.playerName === playerName);
      return samePlayer && typeof answer[field] === 'string';
    }) ?? null;
  }

  private normalizedCategory(answer: AnswerResponse | null | undefined): AnswerFieldKey | null {
    const rawCategory = answer?.category ?? answer?.field;
    if (!rawCategory) {
      return null;
    }

    const category = String(rawCategory).toLowerCase();
    return this.answerFields.some((field) => field.key === category)
      ? category as AnswerFieldKey
      : null;
  }

  private answerId(answer: AnswerResponse | null | undefined): number | null {
    return answer?.answerId ?? answer?.id ?? null;
  }

  private eventType(event: RoomEvent): RoomEventType | null {
    return event.type ?? event.eventType ?? null;
  }

  private extractRoom(event: RoomEvent): Room | null {
    const room = event.room ?? event.payload?.room ?? null;
    if (room) {
      return room;
    }

    return this.isRoomResponse(event) ? event as Room : null;
  }

  private extractRound(event: RoomEvent): RoundResponse | null {
    const round = event.round ?? event.payload?.round ?? null;
    if (round) {
      return round;
    }

    return this.isRoundResponse(event) ? event as RoundResponse : null;
  }

  private extractTimer(event: RoomEvent): TimerResponse | null {
    const timer = event.timer ?? event.payload?.timer ?? null;
    if (timer) {
      return timer;
    }

    const record = event as Record<string, unknown>;
    if (record['startedAt'] || record['expiresAt'] || record['remainingSeconds']) {
      return {
        roundId: typeof record['roundId'] === 'number' ? record['roundId'] : undefined,
        startedAt: typeof record['startedAt'] === 'string' ? record['startedAt'] : null,
        expiresAt: typeof record['expiresAt'] === 'string' ? record['expiresAt'] : null,
        countLimitSeconds: typeof record['countLimitSeconds'] === 'number' ? record['countLimitSeconds'] : null,
        remainingSeconds: typeof record['remainingSeconds'] === 'number' ? record['remainingSeconds'] : null
      };
    }

    return null;
  }

  private extractReview(event: RoomEvent): ReviewStateResponse | null {
    return event.review ?? event.reviewState ?? event.payload?.review ?? event.payload?.reviewState ?? null;
  }

  private extractLeaderboard(event: RoomEvent): LeaderboardResponse | null {
    const leaderboard = event.leaderboard ?? event.payload?.leaderboard ?? null;
    if (leaderboard) {
      return leaderboard;
    }

    const record = event as Record<string, unknown>;
    return record['entries'] || record['rankings']
      ? event as LeaderboardResponse
      : null;
  }

  private mergeRoundState(round: RoundResponse): void {
    const room = this.room();
    if (!room) {
      return;
    }

    const rounds = room.rounds?.length
      ? room.rounds.map((knownRound) => knownRound.id === round.id ? { ...knownRound, ...round } : knownRound)
      : [round];

    if (!rounds.some((knownRound) => knownRound.id === round.id)) {
      rounds.push(round);
    }

    this.updateRoomState({
      ...room,
      currentRound: { ...(room.currentRound ?? {} as RoundResponse), ...round },
      round,
      rounds
    });
  }

  private startTimerDisplay(timer: TimerResponse | null): void {
    if (!timer) {
      return;
    }

    this.timer.set(timer);
    this.refreshTimerRemaining();

    if (!this.timerHandle) {
      this.timerHandle = setInterval(() => this.refreshTimerRemaining(), 1000);
    }
  }

  private refreshTimerRemaining(): void {
    const timer = this.timer();

    if (!timer) {
      this.timerRemaining.set(null);
      return;
    }

    if (typeof timer.remainingSeconds === 'number' && !timer.expiresAt && !timer.startedAt) {
      this.timerRemaining.set(Math.max(0, Math.ceil(timer.remainingSeconds)));
      return;
    }

    const expiresAt = this.toTimestamp(timer.expiresAt);
    if (expiresAt) {
      this.timerRemaining.set(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));
      return;
    }

    const startedAt = this.toTimestamp(timer.startedAt);
    const countLimitSeconds = timer.countLimitSeconds ?? this.room()?.countLimitSeconds ?? null;
    if (startedAt && countLimitSeconds) {
      const expiresFromStart = startedAt + countLimitSeconds * 1000;
      this.timerRemaining.set(Math.max(0, Math.ceil((expiresFromStart - Date.now()) / 1000)));
    }
  }

  private stopTimerDisplay(clearRemaining: boolean): void {
    if (this.timerHandle) {
      clearInterval(this.timerHandle);
      this.timerHandle = null;
    }

    this.timer.set(null);

    if (clearRemaining) {
      this.timerRemaining.set(null);
    }
  }

  private toTimestamp(value: string | null | undefined): number | null {
    if (!value) {
      return null;
    }

    const timestamp = new Date(value).getTime();
    return Number.isNaN(timestamp) ? null : timestamp;
  }

  private isRoomResponse(value: unknown): value is Room {
    const record = value as Record<string, unknown>;
    return Boolean(record && typeof record['roomCode'] === 'string' && Array.isArray(record['players']));
  }

  private isRoundResponse(value: unknown): value is RoundResponse {
    const record = value as Record<string, unknown>;
    return Boolean(record && typeof record['id'] === 'number' && (record['selectedLetter'] !== undefined || record['letter'] !== undefined || record['answers'] !== undefined));
  }
}
