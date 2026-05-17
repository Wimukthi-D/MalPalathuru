import { Routes } from '@angular/router';
import { HowToPlay } from './features/how-to-play/how-to-play';

export const routes: Routes = [

    {
        path: 'how-to-play',
        component: HowToPlay
    },
    {
        path: '**',
        redirectTo: ''
    }

];
