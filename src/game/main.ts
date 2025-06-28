import { Boot } from './scenes/Boot';
import { GameOver } from './scenes/GameOver';
import { Game as MainGame } from './scenes/Game';
import { Game2 as MainGame2 } from './scenes/Game2';
import { Game3 as MainGame3 } from './scenes/Game3';
import { MainMenu } from './scenes/MainMenu';
import { AUTO, Game } from 'phaser';
import { Preloader } from './scenes/Preloader';
import { SoundUI } from './scenes/SoundUI';
import { TimerUI } from './scenes/TimerUI';
import { SoundSettings } from './scenes/SoundSettings';
import { Music } from './scenes/Music';

//  Find out more information about the Game Config at:
//  https://newdocs.phaser.io/docs/3.70.0/Phaser.Types.Core.GameConfig
const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game-container',
    backgroundColor: '#028af8',
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    audio: {
        disableWebAudio: false,
        noAudio: false
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 0 }, // Pas de gravité pour un jeu en vue de dessus
            debug: false
        }
    },
    scene: [
        Preloader,
        MainMenu,
        MainGame,
        MainGame2,
        MainGame3,
        GameOver,
        Boot,
        SoundUI,
        TimerUI,
        SoundSettings,
        Music
    ]
};

const StartGame = (parent: string) => {

    return new Game({ ...config, parent });

}

export default StartGame;
