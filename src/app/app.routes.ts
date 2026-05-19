import { Routes } from '@angular/router';
import { HowToPlay } from './features/how-to-play/how-to-play';
import { Lobby } from './features/lobby/lobby';

export const routes: Routes = [

    {
        path: 'how-to-play',
        component: HowToPlay
    },
    {
        path: 'room/:roomCode/lobby',
        component: Lobby
    },
    {
        path: '**',
        redirectTo: ''
    }

];
