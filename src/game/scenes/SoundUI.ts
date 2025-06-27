import { Scene } from 'phaser';
import { EventBus } from '../EventBus';

export class SoundUI extends Scene {
    private soundBar: Phaser.GameObjects.Graphics;
    private soundBarBg: Phaser.GameObjects.Graphics;
    private debugText: Phaser.GameObjects.Text;
    private statusText: Phaser.GameObjects.Text;

    constructor() {
        super({ key: 'SoundUI', active: true });
    }

    create() {
        // Fond de la barre de son (noir)
        this.soundBarBg = this.add.graphics();
        this.soundBarBg.fillStyle(0x000000, 1);
        this.soundBarBg.fillRect(20, 20, 200, 30);
        
        // Contour de la barre (blanc)
        this.soundBarBg.lineStyle(2, 0xFFFFFF, 1);
        this.soundBarBg.strokeRect(20, 20, 200, 30);

        // Barre de son active
        this.soundBar = this.add.graphics();

        // Texte de debug (plus grand et plus visible)
        this.debugText = this.add.text(20, 60, 'Sound level: 0', {
            fontSize: '24px',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 }
        });

        // Texte d'état du micro
        this.statusText = this.add.text(20, 100, 'Microphone Status: Waiting...', {
            fontSize: '18px',
            color: '#ffff00',
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 }
        });

        // Écouter les événements de son
        EventBus.on('sound-level', this.updateSoundLevel, this);
        EventBus.on('mic-status', this.updateMicStatus, this);
    }

    private updateSoundLevel(level: number) {
        // Mettre à jour la barre de son
        this.soundBar.clear();
        this.soundBar.fillStyle(0x00ff00, 1);
        const barWidth = Math.min((level / 128) * 200, 200);
        this.soundBar.fillRect(20, 20, barWidth, 30);

        // Mettre à jour le texte de debug
        this.debugText.setText(`Sound level: ${Math.round(level)}`);
    }

    private updateMicStatus(status: string, color: string = '#ffff00') {
        this.statusText.setText(`Microphone Status: ${status}`);
        this.statusText.setStyle({ color });
    }
} 