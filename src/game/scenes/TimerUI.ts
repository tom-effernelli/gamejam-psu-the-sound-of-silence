import { Scene } from 'phaser';
import { EventBus } from '../EventBus';

export class TimerUI extends Scene {
    private timerBar: Phaser.GameObjects.Graphics;
    private timerBarBg: Phaser.GameObjects.Graphics;
    private timerText: Phaser.GameObjects.Text;
    private timerValue: number = 100;
    private timer: Phaser.Time.TimerEvent;

    constructor() {
        super({ key: 'TimerUI', active: true });
    }

    create() {
        // Fond de la barre de timer (noir)
        this.timerBarBg = this.add.graphics();
        this.timerBarBg.fillStyle(0x000000, 1);
        this.timerBarBg.fillRect(20, 150, 200, 30);
        
        // Contour de la barre (blanc)
        this.timerBarBg.lineStyle(2, 0xFFFFFF, 1);
        this.timerBarBg.strokeRect(20, 150, 200, 30);

        // Barre de timer active
        this.timerBar = this.add.graphics();
        this.updateTimerBar();

        // Texte du timer
        this.timerText = this.add.text(20, 190, 'Time: 100', {
            fontSize: '24px',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 }
        });

        // Créer un timer qui décrémente toutes les secondes
        this.timer = this.time.addEvent({
            delay: 1000,                // 1000ms = 1 seconde
            callback: this.decrementTimer,
            callbackScope: this,
            loop: true
        });

        // Écouter les événements pour réinitialiser le timer si nécessaire
        EventBus.on('reset-timer', this.resetTimer, this);
    }

    private decrementTimer() {
        if (this.timerValue > 0) {
            this.timerValue--;
            this.updateTimerBar();
            
            // Émettre un événement quand le timer atteint 0
            if (this.timerValue === 0) {
                EventBus.emit('timer-ended');
            }
        }
    }

    private updateTimerBar() {
        // Mettre à jour la barre graphique
        this.timerBar.clear();
        this.timerBar.fillStyle(this.getTimerColor(), 1);
        const barWidth = (this.timerValue / 100) * 200;
        this.timerBar.fillRect(20, 150, barWidth, 30);

        // Mettre à jour le texte
        if (this.timerText) {
            this.timerText.setText(`Time: ${this.timerValue}`);
        }
    }

    private getTimerColor(): number {
        // Change la couleur en fonction du temps restant
        if (this.timerValue > 60) return 0x00ff00;      // Vert
        if (this.timerValue > 30) return 0xffff00;      // Jaune
        return 0xff0000;                                 // Rouge
    }

    private resetTimer() {
        this.timerValue = 100;
        this.updateTimerBar();
    }
} 