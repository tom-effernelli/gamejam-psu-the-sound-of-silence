import { GameObjects, Scene } from 'phaser';

export class Credits extends Scene {
    background: GameObjects.Image;
    creditsText: GameObjects.Text;
    reloadButton: GameObjects.Text;
    torch: GameObjects.Sprite;
    torch2: GameObjects.Sprite;

    constructor() {
        super('Credits');
    }

    create() {
        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Background setup
        this.background = this.add.image(centerX, centerY, 'background');
        const scaleX = width / this.background.width;
        const scaleY = height / this.background.height;
        const scale = Math.max(scaleX, scaleY);
        this.background.setScale(scale).setScrollFactor(0);

        // Torches animation (reusing the existing torch assets)
        this.torch = this.add.sprite(centerX - 600, centerY, 'torch');
        this.torch.setScale(10);
        this.torch.play('torch_burn');

        this.torch2 = this.add.sprite(centerX + 600, centerY, 'torch');
        this.torch2.setScale(10);
        this.torch2.play('torch_burn');

        // Credits text
        this.creditsText = this.add.text(centerX, centerY - 100, 
            'Credits\n\n' +
            'Elwan\n' +
            'Salim\n' +
            'Tom\n' +
            'Thanks for playing! UwU', {
            fontFamily: 'Arial Black',
            fontSize: 32,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 6,
            align: 'center'
        }).setOrigin(0.5).setDepth(100);

        // Reload button
        this.reloadButton = this.add.text(centerX, centerY + 200, 'Return to Main Menu', {
            fontFamily: 'Arial Black',
            fontSize: 40,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 6,
            align: 'center'
        })
        .setOrigin(0.5)
        .setDepth(100)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => this.reloadButton.setScale(1.1))
        .on('pointerout', () => this.reloadButton.setScale(1))
        .on('pointerdown', () => {
            this.scene.start('MainMenu');
        });
    }
} 