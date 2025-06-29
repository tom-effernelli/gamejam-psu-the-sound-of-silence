import { GameObjects, Scene } from 'phaser';
import { EventBus } from '../EventBus';

export class Victory extends Scene
{
    background: GameObjects.Image;
    victoryText: GameObjects.Text;
    menuButton: GameObjects.Text;
    torch: GameObjects.Sprite;
    torch2: GameObjects.Sprite;
    victorySound: Phaser.Sound.BaseSound;

    constructor ()
    {
        super('Victory');
    }

    preload ()
    {
        this.load.audio('victory-sound', 'assets/SD/UI/Victory/VictorySound.wav');
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

        // Fond d'écran
        this.background = this.add.image(centerX, centerY, 'background');
        const scaleX = width / this.background.width;
        const scaleY = height / this.background.height;
        const scale = Math.max(scaleX, scaleY);
        this.background.setScale(scale).setScrollFactor(0);

        // Texte de victoire
        this.victoryText = this.add.text(centerX, centerY - 100, 'VICTORY!', {
            fontFamily: 'Arial Black',
            fontSize: 80,
            color: '#FFD700',
            stroke: '#000000',
            strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5).setDepth(100);

        // Animation des torches
        this.anims.create({
            key: 'torch_burn',
            frames: this.anims.generateFrameNumbers('torch', { start: 0, end: 7 }),
            frameRate: 9,
            repeat: -1
        });

        // Torches décoratives
        this.torch = this.add.sprite(centerX - 600, centerY, 'torch');
        this.torch.setScale(10);
        this.torch.play('torch_burn');

        this.torch2 = this.add.sprite(centerX + 600, centerY, 'torch');
        this.torch2.setScale(10);
        this.torch2.play('torch_burn');

        // Bouton retour au menu
        this.menuButton = this.add.text(centerX, centerY + 100, 'Return to Menu', {
            fontFamily: 'Arial Black',
            fontSize: 40,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 6,
            align: 'center'
        }).setOrigin(0.5).setDepth(100)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => this.menuButton.setScale(1.1))
        .on('pointerout', () => this.menuButton.setScale(1))
        .on('pointerdown', () => this.returnToMenu());

        // Animation du texte de victoire
        this.tweens.add({
            targets: this.victoryText,
            scale: { from: 0.5, to: 1 },
            alpha: { from: 0, to: 1 },
            duration: 1000,
            ease: 'Back.easeOut'
        });

        EventBus.emit('current-scene-ready', this);
    }

    returnToMenu ()
    {
        window.location.reload();
    }
} 