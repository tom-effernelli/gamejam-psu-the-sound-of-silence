import { Scene } from 'phaser';
import { EventBus } from '../EventBus';

export class SoundSettings extends Scene {
    private slider: Phaser.GameObjects.Graphics;
    private sliderBg: Phaser.GameObjects.Graphics;
    private sliderHandle: Phaser.GameObjects.Graphics;
    private valueText: Phaser.GameObjects.Text;
    private titleText: Phaser.GameObjects.Text;
    private isDragging: boolean = false;
    private currentValue: number = 60; // Valeur par défaut du SOUND_THRESHOLD

    constructor() {
        super({ key: 'SoundSettings', active: true });
    }

    create() {
        const width = this.cameras.main.width;

        // Fond du slider (noir)
        this.sliderBg = this.add.graphics();
        this.sliderBg.lineStyle(2, 0xFFFFFF, 1);
        this.sliderBg.beginPath();
        this.sliderBg.moveTo(width - 200, 80);
        this.sliderBg.lineTo(width - 40, 80);
        this.sliderBg.strokePath();

        // Slider handle
        this.sliderHandle = this.add.graphics();
        this.updateSliderHandle();

        // Texte de la valeur
        this.valueText = this.add.text(width - 120, 100, `Sensibilité micro ${this.currentValue}`, {
            fontSize: '12px',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 }
        });
        this.valueText.setOrigin(0.5, 0);

        // Rendre le handle interactif
        const hitArea = new Phaser.Geom.Rectangle(width - 200, 60, 160, 40);
        this.sliderHandle.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

        // Gérer les événements de drag
        this.input.setDraggable(this.sliderHandle);

        this.input.on('dragstart', () => {
            this.isDragging = true;
            console.log('Début du drag');
        });

        this.input.on('drag', (pointer: Phaser.Input.Pointer) => {
            if (this.isDragging) {
                let x = Phaser.Math.Clamp(pointer.x, this.cameras.main.width - 200, this.cameras.main.width - 40);
                this.currentValue = Math.round(((x - (this.cameras.main.width - 200)) / 160) * 200 + 30);
                this.updateSliderHandle();
                this.valueText.setText(`Seuil: ${this.currentValue}`);
                
                // Émettre l'événement avec la nouvelle valeur
                console.log('Émission de sound-threshold-change avec la valeur:', this.currentValue);
                EventBus.emit('sound-threshold-change', this.currentValue);
            }
        });

        this.input.on('dragend', () => {
            this.isDragging = false;
            console.log('Fin du drag');
        });

        // Écouter les changements de seuil sonore
        EventBus.on('sound-threshold-get', (callback: (value: number) => void) => {
            console.log('Réception de sound-threshold-get, valeur actuelle:', this.currentValue);
            callback(this.currentValue);
        });

        // Informer SoundUI de la valeur initiale
        console.log('Émission de la valeur initiale:', this.currentValue);
        EventBus.emit('sound-threshold-change', this.currentValue);
    }

    private updateSliderHandle() {
        this.sliderHandle.clear();
        this.sliderHandle.fillStyle(0x00ff00, 1);
        const x = ((this.currentValue - 30) / 200) * 160 + (this.cameras.main.width - 200);
        this.sliderHandle.fillCircle(x, 80, 8);
    }

    shutdown() {
        // Nettoyage des événements
        EventBus.off('sound-threshold-get');
    }
} 