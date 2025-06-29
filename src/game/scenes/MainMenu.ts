import { GameObjects, Scene } from 'phaser';

import { EventBus } from '../EventBus';

export class MainMenu extends Scene
{
    background: GameObjects.Image;
    logo: GameObjects.Image;
    title: GameObjects.Text;
    playButton: GameObjects.Text;
    helpButton: GameObjects.Text;
    creditsButton: GameObjects.Text;
    logoTween: Phaser.Tweens.Tween | null;
    startSound: Phaser.Sound.BaseSound;
    torch: GameObjects.Sprite;
    torch2: GameObjects.Sprite;
    constructor ()
    {
        super('MainMenu');
    }

    preload ()
    {
        this.load.audio('start-sound', 'assets/SD/UI/StartGame/SartButton.wav');
        this.load.spritesheet('torch', 'assets/Torch.png', {
            frameWidth: 32,
            frameHeight: 32
        });
    }

    create ()
    {
        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        this.background = this.add.image(centerX, centerY, 'background');
        const scaleX = width / this.background.width;
        const scaleY = height / this.background.height;
        const scale = Math.max(scaleX, scaleY);
        this.background.setScale(scale).setScrollFactor(0);

        this.logo = this.add.image(centerX, centerY - 100, 'logo').setDepth(100);
        this.logo.setScale(1.5);

        // Création de l'animation de la torche
        this.anims.create({
            key: 'torch_burn',
            frames: this.anims.generateFrameNumbers('torch', { start: 0, end: 7 }),
            frameRate: 9,
            repeat: -1
        });

        // Ajout de la torche
        this.torch = this.add.sprite(centerX- 600, centerY, 'torch');
        this.torch.setScale(10);
        this.torch.play('torch_burn');

        this.torch2 = this.add.sprite(centerX+ 600, centerY, 'torch');
        this.torch2.setScale(10);
        this.torch2.play('torch_burn');

        this.startSound = this.sound.add('start-sound', {
            volume: 0.1,
            loop: false
        });

        this.playButton = this.add.text(centerX, centerY+50, 'Start the Adventure', {
            fontFamily: 'Arial Black', fontSize: 40, color: '#ffffff',
            stroke: '#000000', strokeThickness: 6,
            align: 'center'
        }).setOrigin(0.5).setDepth(100)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => this.playButton.setScale(1.1))
        .on('pointerout', () => this.playButton.setScale(1))
        .on('pointerdown', () => {
            this.startSound.play();
            this.changeScene();
        });

        this.helpButton = this.add.text(centerX, centerY+120, 'Help', {
            fontFamily: 'Arial Black', fontSize: 40, color: '#ffffff',
            stroke: '#000000', strokeThickness: 6,
            align: 'center'
        }).setOrigin(0.5).setDepth(100)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => this.helpButton.setScale(1.1))
        .on('pointerout', () => this.helpButton.setScale(1))
        .on('pointerdown', () => {
            this.scene.start('Help');
        });

        this.creditsButton = this.add.text(centerX, centerY+190, 'Credits', {
            fontFamily: 'Arial Black', fontSize: 40, color: '#ffffff',
            stroke: '#000000', strokeThickness: 6,
            align: 'center'
        }).setOrigin(0.5).setDepth(100)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => this.creditsButton.setScale(1.1))
        .on('pointerout', () => this.creditsButton.setScale(1))
        .on('pointerdown', () => {
            this.scene.start('Credits');
        });

        EventBus.emit('current-scene-ready', this);
    }
    
    changeScene ()
    {
        if (this.logoTween)
        {
            this.logoTween.stop();
            this.logoTween = null;
        }

        EventBus.emit('start-game');
        this.scene.start('Game');
    }

    moveLogo (reactCallback: ({ x, y }: { x: number, y: number }) => void)
    {
        if (this.logoTween)
        {
            if (this.logoTween.isPlaying())
            {
                this.logoTween.pause();
            }
            else
            {
                this.logoTween.play();
            }
        } 
        else
        {
            this.logoTween = this.tweens.add({
                targets: this.logo,
                x: { value: 750, duration: 3000, ease: 'Back.easeInOut' },
                y: { value: 80, duration: 1500, ease: 'Sine.easeOut' },
                yoyo: true,
                repeat: -1,
                onUpdate: () => {
                    if (reactCallback)
                    {
                        reactCallback({
                            x: Math.floor(this.logo.x),
                            y: Math.floor(this.logo.y)
                        });
                    }
                }
            });
        }
    }
}
