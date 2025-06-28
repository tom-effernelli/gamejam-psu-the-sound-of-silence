import { Scene } from 'phaser';

export class Music extends Scene {
    private music!: Phaser.Sound.BaseSound;
    private keyCollectSound!: Phaser.Sound.BaseSound;
    private doorLockedSound!: Phaser.Sound.BaseSound;
    private doorOpenSound!: Phaser.Sound.BaseSound;
    private isReady: boolean = false;

    constructor() {
        super({ key: 'Music', active: true });
    }

    preload() {
        this.load.audio('background-music', 'assets/SD/Ambient/AmbientDrone.wav');
        this.load.audio('key-collect', 'assets/SD/Player/CollectKey/CollectKey.wav');
        this.load.audio('door-locked', 'assets/SD/Player/OpenDoor/OpenWithoutKey.wav');
        this.load.audio('door-open', 'assets/SD/Player/OpenDoor/OpenDoor.wav');
    }

    create() {
        console.log('Music scene creating...');
        this.music = this.sound.add('background-music', {
            loop: true,
            volume: 0.8
        });
        this.music.play();

        this.keyCollectSound = this.sound.add('key-collect', {
            loop: false,
            volume: 1
        });

        this.doorLockedSound = this.sound.add('door-locked', {
            loop: false,
            volume: 0.5
        });

        this.doorOpenSound = this.sound.add('door-open', {
            loop: false,
            volume: 0.3
        });

        // Empêcher la musique de s'arrêter quand on change d'onglet
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Forcer la musique à continuer même si la page est cachée
                this.game.sound.unlock();
                if (!this.music.isPlaying) {
                    this.music.play();
                }
            }
        });

        this.isReady = true;
        console.log('Music scene ready!');
    }

    playKeyCollectSound() {
        if (!this.isReady || !this.keyCollectSound) {
            console.warn('Key collect sound not ready');
            return;
        }
        this.keyCollectSound.play();
    }

    playDoorLockedSound() {
        if (!this.isReady || !this.doorLockedSound) {
            console.warn('Door locked sound not ready');
            return;
        }
        console.log('Playing door locked sound...');
        this.doorLockedSound.play();
    }

    playDoorOpenSound() {
        if (!this.isReady || !this.doorOpenSound) {
            console.warn('Door open sound not ready');
            return;
        }
        console.log('Playing door open sound...');
        this.doorOpenSound.play();
    }

    isSceneReady(): boolean {
        return this.isReady;
    }
} 