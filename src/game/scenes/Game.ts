import { EventBus } from '../EventBus';
import { Scene } from 'phaser';

export class Game extends Scene
{
    private camera: Phaser.Cameras.Scene2D.Camera;
    private map: Phaser.Tilemaps.Tilemap;
    private player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    
    // Propriétés pour le microphone
    private audioContext: AudioContext;
    private mediaStream: MediaStream | null = null;
    private audioAnalyser: AnalyserNode | null = null;
    private dataArray: Uint8Array;
    private micThreshold = 15; // Seuil plus bas pour mieux détecter
    
    // UI pour le son
    private soundBar: Phaser.GameObjects.Graphics;
    private soundBarBg: Phaser.GameObjects.Graphics;
    private debugText: Phaser.GameObjects.Text;

    // Système d'ombre
    private shadowLayer: Phaser.GameObjects.RenderTexture;
    private spotlight: Phaser.GameObjects.Light;
    private mask: Phaser.Display.Masks.GeometryMask;
    private lightCircle: Phaser.GameObjects.Graphics;

    constructor ()
    {
        super('Game');
        this.audioContext = new AudioContext();
        this.dataArray = new Uint8Array(1024);
    }

    async initMicrophone() {
        try {
            console.log('Requesting microphone access...');
            EventBus.emit('mic-status', 'Requesting access...', '#ffff00');
            
            this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: false
                }
            });
            
            this.audioContext = new AudioContext();
            const source = this.audioContext.createMediaStreamSource(this.mediaStream);
            this.audioAnalyser = this.audioContext.createAnalyser();
            this.audioAnalyser.fftSize = 2048;
            this.audioAnalyser.smoothingTimeConstant = 0.8;
            source.connect(this.audioAnalyser);
            this.dataArray = new Uint8Array(this.audioAnalyser.frequencyBinCount);
            
            console.log('Microphone initialized successfully');
            EventBus.emit('mic-status', 'Active ✓', '#00ff00');
            
        } catch (error: unknown) {
            console.error('Error accessing microphone:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            EventBus.emit('mic-status', `Error: ${errorMessage}`, '#ff0000');
        }
    }

    private createSoundUI() {
        // Fond de la barre de son (noir)
        this.soundBarBg = this.add.graphics();
        this.soundBarBg.setScrollFactor(0);
        this.soundBarBg.fillStyle(0x000000, 1);
        this.soundBarBg.fillRect(20, 20, 200, 30);
        
        // Contour de la barre (blanc)
        this.soundBarBg.lineStyle(2, 0xFFFFFF, 1);
        this.soundBarBg.strokeRect(20, 20, 200, 30);

        // Barre de son active
        this.soundBar = this.add.graphics();
        this.soundBar.setScrollFactor(0);

        // Texte de debug (plus grand et plus visible)
        this.debugText = this.add.text(20, 60, 'Sound level: 0', {
            fontSize: '24px',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 }
        });
        this.debugText.setScrollFactor(0);
        
        // Texte d'état du micro
        this.add.text(20, 100, 'Microphone Status: Initializing...', {
            fontSize: '18px',
            color: '#ffff00',
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 }
        }).setScrollFactor(0);
    }

    private processMicrophoneInput() {
        if (!this.audioAnalyser) {
            return;
        }

        this.audioAnalyser.getByteFrequencyData(this.dataArray);
        
        // Calculer la moyenne du volume
        let sum = 0;
        const numFrequencies = 50;
        for (let i = 0; i < numFrequencies; i++) {
            sum += this.dataArray[i];
        }
        const average = sum / numFrequencies;
        
        // Émettre le niveau sonore pour l'UI
        EventBus.emit('sound-level', average);

        // Si le son dépasse le seuil
        if (average > this.micThreshold) {
            console.log('Sound detected:', average);
        }
    }

    preload ()
    {
        // Chargement de la tilemap et du tileset
        this.load.tilemapTiledJSON('map', 'assets/tuxemon-town.json');
        this.load.image('tiles', 'assets/tuxmon-sample-32px-extruded.png');
        
        // Chargement du sprite du joueur (un carré rouge pour l'instant)
        this.load.image('player', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAGklEQVRYR+3BAQEAAACCIP+vbkhAAQAAAO8GECAAAZf3V9cAAAAASUVORK5CYII=');
    }

    async create() {
        // Active la physique Arcade
        this.physics.world.setBounds(0, 0, 1280, 1280);

        this.camera = this.cameras.main;
        
        // Création de l'interface du son AVANT l'initialisation du micro
        this.createSoundUI();
        console.log('Sound UI created');
        
        // Initialisation du microphone
        await this.initMicrophone();
        
        // Création de la tilemap
        this.map = this.make.tilemap({ key: 'map' });
        
        // Ajout du tileset à la map
        const tileset = this.map.addTilesetImage('tuxmon-sample-32px-extruded', 'tiles');
        
        // Création des layers
        if (tileset) {
            this.map.createLayer('Below Player', tileset, 0, 0);
            const worldLayer = this.map.createLayer('World', tileset, 0, 0);
            this.map.createLayer('Above Player', tileset, 0, 0);

            // Activer les collisions sur le layer World
            if (worldLayer) {
                worldLayer.setCollisionByProperty({ collides: true });
            }

            // Création du joueur
            const spawnPoint = this.map.findObject("Objects", obj => obj.name === "Spawn Point");
            const spawnX = spawnPoint ? (spawnPoint.x || 400) : 400;
            const spawnY = spawnPoint ? (spawnPoint.y || 400) : 400;
            
            this.player = this.physics.add.sprite(spawnX, spawnY, 'player');
            this.player.setCollideWorldBounds(true);

            // Collision entre le joueur et le layer World
            const worldLayerInfo = this.map.getLayer('World');
            if (worldLayerInfo && worldLayerInfo.tilemapLayer) {
                this.physics.add.collider(this.player, worldLayerInfo.tilemapLayer);
            }

            // Création du système d'ombre
            this.createShadowSystem();
        }

        // Création des contrôles
        this.cursors = this.input.keyboard.createCursorKeys();

        // La caméra suit le joueur
        if (this.player && this.camera) {
            this.camera.startFollow(this.player, true);
            this.camera.setZoom(1.5);
        }

        EventBus.emit('current-scene-ready', this);
    }

    private createShadowSystem() {
        // Créer un grand rectangle noir qui couvre toute la map
        const darkness = this.add.graphics();
        darkness.fillStyle(0x000000, 0.95);
        darkness.fillRect(-2000, -2000, 4000, 4000);
        darkness.setDepth(1000); // Au-dessus de tout

        // Créer le masque qui révélera la zone autour du joueur
        this.lightCircle = this.add.graphics();
        this.lightCircle.clear();
        
        // Dessiner le cercle de vision
        this.lightCircle.fillStyle(0xffffff);
        this.lightCircle.fillCircle(0, 0, 150);
        
        // Créer le masque et l'appliquer au rectangle noir
        this.mask = new Phaser.Display.Masks.GeometryMask(this, this.lightCircle);
        this.mask.invertAlpha = true; // Important: inverse le masque pour voir à travers le cercle
        darkness.setMask(this.mask);
    }

    update()
    {
        // Gestion des déplacements du joueur
        const speed = 175;

        if (!this.cursors || !this.player) {
            return;
        }

        // Déplacement horizontal
        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-speed);
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(speed);
        } else {
            this.player.setVelocityX(0);
        }

        // Déplacement vertical
        if (this.cursors.up.isDown) {
            this.player.setVelocityY(-speed);
        } else if (this.cursors.down.isDown) {
            this.player.setVelocityY(speed);
        } else {
            this.player.setVelocityY(0);
        }

        // Normaliser la vitesse en diagonale
        if (this.player.body) {
            this.player.body.velocity.normalize().scale(speed);
        }

        // Mettre à jour la position de la zone de vision
        if (this.lightCircle && this.player) {
            this.lightCircle.setPosition(this.player.x, this.player.y);
            
            // Effet de "respiration" de la zone de vision
            this.lightCircle.clear();
            this.lightCircle.fillStyle(0xffffff);
            
            // Créer un effet de dégradé avec plusieurs cercles
            const baseRadius = 150;
            const alpha = 0.2;
            this.lightCircle.fillStyle(0xffffff, alpha);
            const radius = baseRadius;
            this.lightCircle.fillCircle(0, 0, radius);
        }

        // Traitement du son du microphone
        this.processMicrophoneInput();
    }

    changeScene ()
    {
        this.scene.start('GameOver');
    }
}
