import { Scene } from 'phaser';
import { EventBus } from '../EventBus';

export class TimerUI extends Scene {
    private timerBar: Phaser.GameObjects.Graphics;
    private timerBarBg: Phaser.GameObjects.Graphics;
    private timerText: Phaser.GameObjects.Text;
    private timerValue: number = 100;
    private timer: Phaser.Time.TimerEvent;
    private decreaseAmount: number = 2; // Diminue de 2 par tick au lieu de 1
    private flashEffect: Phaser.GameObjects.Graphics;

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
        
        // Effet de flash pour l'augmentation
        this.flashEffect = this.add.graphics();
        
        this.updateTimerBar();

        // Texte du timer
        this.timerText = this.add.text(20, 190, 'Time: 100', {
            fontSize: '24px',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 }
        });

        // Timer plus rapide (500ms au lieu de 1000ms)
        this.timer = this.time.addEvent({
            delay: 500,
            callback: this.decrementTimer,
            callbackScope: this,
            loop: true
        });

        // Écouter les événements
        EventBus.on('reset-timer', this.resetTimer, this);
        EventBus.on('increase-timer', this.increaseTimer, this);
    }

    private increaseTimer(amount: number) {
        const oldValue = this.timerValue;
        this.timerValue = Math.min(100, this.timerValue + amount);
        
        // Si il y a eu une augmentation effective
        if (this.timerValue > oldValue) {
            // Effet de flash
            this.flashEffect.clear();
            this.flashEffect.fillStyle(0xffff00, 0.5);
            this.flashEffect.fillRect(20, 150, 200, 30);
            
            // Animation de disparition du flash
            this.tweens.add({
                targets: this.flashEffect,
                alpha: 0,
                duration: 200,
                onComplete: () => {
                    this.flashEffect.clear();
                    this.flashEffect.alpha = 1;
                }
            });
        }
        
        this.updateTimerBar();
    }

    private decrementTimer() {
        if (this.timerValue > 0) {
            // Diminue plus rapidement
            this.timerValue = Math.max(0, this.timerValue - this.decreaseAmount);
            this.updateTimerBar();
            
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