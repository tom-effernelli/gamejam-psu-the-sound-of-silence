import { Scene } from 'phaser';

export class Music extends Scene {
    private music!: Phaser.Sound.BaseSound;
    private keyCollectSound!: Phaser.Sound.BaseSound;
    private doorLockedSound!: Phaser.Sound.BaseSound;
    private doorOpenSound!: Phaser.Sound.BaseSound;
    private footstepSounds: Phaser.Sound.BaseSound[] = [];
    private isReady: boolean = false;

    constructor() {
        super({ key: 'Music', active: true });
    }

    preload() {
        this.load.audio('background-music', 'assets/SD/Ambient/AmbientDrone.wav');
        this.load.audio('key-collect', 'assets/SD/Player/CollectKey/CollectKey.wav');
        this.load.audio('door-locked', 'assets/SD/Player/OpenDoor/OpenWithoutKey.wav');
        this.load.audio('door-open', 'assets/SD/Player/OpenDoor/OpenDoor.wav');
        
        // Charger les sons de pas
        for (let i = 1; i <= 6; i++) {
            this.load.audio(`footstep-${i}`, `assets/SD/Player/Walk/RandomStepSounds/SFX_StepMC${i}.mp3`);
        }
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

        // Ajouter les sons de pas
        for (let i = 1; i <= 6; i++) {
            const footstepSound = this.sound.add(`footstep-${i}`, {
                loop: false,
                volume: 0.2
            });
            this.footstepSounds.push(footstepSound);
        }

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

    playRandomFootstepSound() {
        if (!this.isReady || this.footstepSounds.length === 0) {
            console.warn('Footstep sounds not ready');
            return;
        }
        const randomIndex = Math.floor(Math.random() * this.footstepSounds.length);
        this.footstepSounds[randomIndex].play();
    }

    isSceneReady(): boolean {
        return this.isReady;
    }
} 