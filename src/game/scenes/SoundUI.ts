import { Scene } from 'phaser';
import { EventBus } from '../EventBus';

export class SoundUI extends Scene {
    private soundBar: Phaser.GameObjects.Graphics;
    private soundBarBg: Phaser.GameObjects.Graphics;
    private debugText: Phaser.GameObjects.Text;
    private statusText: Phaser.GameObjects.Text;
    private soundThreshold: number = 130; // Valeur par défaut
    private lastIncreaseTime = 0; // Pour éviter d'augmenter trop souvent
    private isVisible: boolean = true; // Nouvelle propriété pour contrôler la visibilité

    constructor() {
        super({ key: 'SoundUI', active: true });
    }

    // Méthode pour définir la visibilité
    setVisible(visible: boolean): void {
        this.isVisible = visible;
        this.soundBar?.setVisible(visible);
        this.soundBarBg?.setVisible(visible);
        this.debugText?.setVisible(visible);
        this.statusText?.setVisible(visible);
    }

    create() {
        console.log('SoundUI: Création de la scène');
        
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

        // Texte pour le seuil
        const thresholdText = this.add.text(20, 130, `Seuil actuel: ${this.soundThreshold}`, {
            fontSize: '18px',
            color: '#00ff00',
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 }
        });

        // Rendre les éléments invisibles
        this.soundBar.visible = false;
        this.soundBarBg.visible = false;
        this.debugText.visible = false;
        this.statusText.visible = false;
        thresholdText.visible = false;

        // Écouter les événements de son
        EventBus.on('sound-level', this.updateSoundLevel, this);
        EventBus.on('mic-status', this.updateMicStatus, this);
        
        // Écouter les changements de seuil
        EventBus.on('sound-threshold-change', (value: number) => {
            console.log('SoundUI: Réception du nouveau seuil:', value);
            this.soundThreshold = value;
            thresholdText.setText(`Seuil actuel: ${this.soundThreshold}`);
        });

        // Cacher l'interface sonore au démarrage
        this.setVisible(false);
        
        console.log('SoundUI: Initialisation terminée avec seuil', this.soundThreshold);
    }

    private updateSoundLevel(level: number) {
        // Vérifier si la scène est active et si les éléments existent
        if (!this.scene.isActive() || !this.soundBar || !this.debugText) {
            return;
        }

        // Mettre à jour la barre de son (même si invisible)
        this.soundBar.clear();
        this.soundBar.fillStyle(0x00ff00, 1);
        const barWidth = Math.min((level / 128) * 200, 200);
        this.soundBar.fillRect(20, 20, barWidth, 30);
        this.soundBar.visible = false;

        // Mettre à jour le texte de debug
        if (this.debugText && this.debugText.scene) {
            this.debugText.setText(`Sound level: ${Math.round(level)}`);
            this.debugText.visible = false;
        }

        // Si le son est fort et qu'on n'a pas augmenté récemment
        const currentTime = this.time.now;
        if (level > this.soundThreshold && currentTime - this.lastIncreaseTime > 100) {
            console.log('SoundUI: Son au-dessus du seuil', level, '>', this.soundThreshold);
            // Augmentation plus importante
            const increase = Math.min(Math.floor((level - this.soundThreshold) / 2), 5)*0.7;
            if (increase > 0) {
                console.log('SoundUI: Augmentation du timer de', increase);
                EventBus.emit('increase-timer', increase);
                this.lastIncreaseTime = currentTime;
                
                // Effet visuel (même si invisible)
                if (this.soundBar && this.soundBar.scene) {
                    this.soundBar.fillStyle(0xff7700, 1);
                    this.soundBar.fillRect(20, 20, barWidth, 30);
                    this.soundBar.visible = false;
                }
            }
        } /*else if (level > 30 && level <= this.soundThreshold) { 
            // Petite augmentation UNIQUEMENT si on est en dessous du seuil
            // mais au-dessus du niveau minimum de détection
            EventBus.emit('increase-timer', 1);
            this.lastIncreaseTime = currentTime;
        }*/
    }

    private updateMicStatus(status: string, color: string = '#ffff00') {
        this.statusText.setText(`Microphone Status: ${status}`);
        this.statusText.setStyle({ color });
        this.statusText.visible = false;
    }

    shutdown() {
        console.log('SoundUI: Arrêt de la scène');
        // Nettoyage des événements lors de l'arrêt de la scène
        EventBus.off('sound-level', this.updateSoundLevel, this);
        EventBus.off('mic-status', this.updateMicStatus, this);
        EventBus.off('sound-threshold-change');
    }
} 