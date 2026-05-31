import { inject, Injectable } from "@angular/core";
import { environment } from "../../../environments/environment";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { catchError, Observable, throwError } from "rxjs";



@Injectable({ providedIn: 'root' })
export class ApiManagerService {



    private readonly http = inject(HttpClient);
    private readonly baseUrl = environment.apiBaseUrl;

    get<TResponse>(endpoint: string): Observable<TResponse> {
        return this.http
            .get<TResponse>(this.createUrl(endpoint))
            .pipe(catchError(this.handleError));
    }

    post<TRequest, TResponse>(endpoint: string, requestBody: TRequest): Observable<TResponse> {
        return this.http
            .post<TResponse>(this.createUrl(endpoint), requestBody)
            .pipe(catchError(this.handleError));
    }
    patch<TRequest, TResponse>(endpoint: string, requestBody: TRequest | null = null): Observable<TResponse> {
        return this.http
            .patch<TResponse>(this.createUrl(endpoint), requestBody)
            .pipe(catchError(this.handleError));
    }

    delete<TResponse>(endpoint: string): Observable<TResponse> {
        return this.http
            .delete<TResponse>(this.createUrl(endpoint))
            .pipe(catchError(this.handleError));
    }

    private createUrl(endpoint: string): string {
        const cleanEndpoint = endpoint.startsWith('/')
            ? endpoint.substring(1)
            : endpoint;

        return `${this.baseUrl}/${cleanEndpoint}`;
    }

    private handleError(error: HttpErrorResponse) {
        let message = 'Something went wrong. Please try again.';

        if (typeof error.error === 'string') {
            message = error.error;
        }

        if (error.error?.message) {
            message = error.error.message;
        }

        if (error.error?.errors) {
            const firstError = Object.values(error.error.errors)[0];
            message = Array.isArray(firstError) ? String(firstError[0]) : String(firstError);
        }

        if (error.status === 404 && message === 'Something went wrong. Please try again.') {
            message = 'Room was not found.';
        }

        if (error.status === 0) {
            message = 'Cannot reach the game server. Please check that the backend is running.';
        }

        return throwError(() => new Error(message));
    }



}
