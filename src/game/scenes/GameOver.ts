import { EventBus } from '../EventBus';
import { Scene } from 'phaser';

export class GameOver extends Scene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    background: Phaser.GameObjects.Image;
    gameOverText: Phaser.GameObjects.Text;
    restartButton: Phaser.GameObjects.Text;

    constructor ()
    {
        super('GameOver');
    }

    create ()
    {
        this.camera = this.cameras.main
        this.camera.setBackgroundColor(0xff0000);

        this.background = this.add.image(512, 384, 'background');
        this.background.setAlpha(0.5);

        this.gameOverText = this.add.text(512, 384, 'Game Over', {
            fontFamily: 'Arial Black', fontSize: 64, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5).setDepth(100);

        // Add restart button
        this.restartButton = this.add.text(512, 484, 'Recommencer', {
            fontFamily: 'Arial Black',
            fontSize: 32,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 6,
            align: 'center'
        }).setOrigin(0.5).setDepth(100);

        // Make the button interactive
        this.restartButton.setInteractive({ useHandCursor: true });
        this.restartButton.on('pointerover', () => this.restartButton.setScale(1.1));
        this.restartButton.on('pointerout', () => this.restartButton.setScale(1));
        this.restartButton.on('pointerdown', () => this.changeScene());
        
        EventBus.emit('current-scene-ready', this);
    }

    changeScene ()
    {
        window.location.reload();
    }
}
