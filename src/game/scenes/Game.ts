import { EventBus } from '../EventBus';
import { Scene } from 'phaser';

// Interface pour l'ennemi
interface CustomEnemy extends Phaser.Types.Physics.Arcade.SpriteWithDynamicBody {
    enemyType: number;
}

export class Game extends Scene
{
    private camera: Phaser.Cameras.Scene2D.Camera;
    private map: Phaser.Tilemaps.Tilemap;
    private player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    private enemy: CustomEnemy;
    private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null;
    private currentSoundLevel: number = 0;
    private key: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    
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
    private timerValue: number = 100; // Nouvelle propriété pour stocker la valeur du timer

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

    private createKey(x: number, y: number): Phaser.Types.Physics.Arcade.SpriteWithDynamicBody {
        console.log('createKey called with:', x, y);
        // Création de la clé
        const key = this.physics.add.sprite(x, y, 'key');
        console.log('Key sprite created:', key);
        
        // Redimensionnement de la clé
        key.setScale(0.15); // Réduire à 10% de sa taille originale
        
        // Ajout des collisions avec le monde
        const worldLayerInfo = this.map.getLayer('World');
        if (worldLayerInfo && worldLayerInfo.tilemapLayer) {
            this.physics.add.collider(key, worldLayerInfo.tilemapLayer);
        }
    
        // Ajout de la collision avec le joueur APRÈS l'initialisation complète
        if (this.player) {
            // Ajout d'un délai pour éviter la collection immédiate
            this.time.delayedCall(100, () => {
                this.physics.add.overlap(this.player, key, this.collectKey, undefined, this);
            });
        }
        
        return key;
    }

    private collectKey: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (_obj1, obj2) => {
        // Désactive et cache la clé
        const keySprite = obj2 as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
        keySprite.disableBody(true, true);
        
        // Émet un événement pour indiquer que la clé a été collectée
        EventBus.emit('key-collected');
        
        console.log('Clé collectée !');
    }

    preload ()
    {
        this.load.on('loaderror', (file: { key: string; url: string }) => {
            console.error('Error loading file:', file.key, file.url);
        });

        // Chargement de la tilemap et du tileset
        console.log('Loading tilemap...');
        this.load.tilemapTiledJSON('map', 'assets/Niveau1.tmj');
        console.log('Loading tileset...');
        this.load.image('tiles', 'assets/dungeon.png');
        console.log('Assets loaded in preload');
        
        // Chargement du sprite du joueur (un carré rouge pour l'instant)
        this.load.image('player', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAGklEQVRYR+3BAQEAAACCIP+vbkhAAQAAAO8GECAAAZf3V9cAAAAASUVORK5CYII=');
        
        // Chargement du sprite de l'ennemi (un carré bleu)
        this.load.image('enemy', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAGklEQVRYR+3BAQEAAACCIP+vbkhAAQAAAO8GECAAAZf3V9cAAAAASUVORK5CYII=');

        // Chargement du sprite de la clé (un carré jaune pour l'instant)
        //this.load.image('key', 'assets/key.png');
    }

    private createEnemy(x: number, y: number, type: number = 1): CustomEnemy {
        const enemy = this.physics.add.sprite(x, y, 'enemy') as CustomEnemy;
        enemy.setCollideWorldBounds(true);
        enemy.enemyType = type;

        // Apparence selon le type
        switch(type) {
            case 1:
                enemy.setTint(0x0000ff); // Bleu pour type 1 (réagit au son)
                break;
            default:
                enemy.setTint(0xff0000); // Rouge pour les autres types
        }

        // Ajouter les collisions avec le monde
        const worldLayerInfo = this.map.getLayer('Calque de Tuiles 3');
        if (worldLayerInfo && worldLayerInfo.tilemapLayer) {
            this.physics.add.collider(enemy, worldLayerInfo.tilemapLayer);
            this.physics.add.collider(this.player, enemy);
        }

        return enemy;
    }

    async create() {
        console.log('Starting create function...');
        // Active la physique Arcade
        this.physics.world.setBounds(0, 0, 1280, 1280);

        this.camera = this.cameras.main;
        
        // Création de l'interface du son AVANT l'initialisation du micro
        this.createSoundUI();
        console.log('Sound UI created');
        
        // Initialisation du microphone
        await this.initMicrophone();
        
        // Création de la tilemap
        console.log('Creating tilemap...');
        try {
            this.map = this.make.tilemap({ key: 'map' });
            if (!this.map) {
                throw new Error('Failed to create tilemap');
            }
            console.log('Tilemap created:', this.map);
            
            // Ajout du tileset à la map
            console.log('Adding tileset...');
            const tileset = this.map.addTilesetImage('DungeonBasic', 'tiles');
            if (!tileset) {
                throw new Error('Failed to add tileset. Make sure the tileset is embedded in the map file (use "Embed Tilesets" when exporting from Tiled)');
            }
            console.log('Tileset added:', tileset);
            
            // Création des layers
            const groundLayer = this.map.createLayer('Calque de Tuiles 1', tileset, 0, 0);
            const worldLayer = this.map.createLayer('Calque de Tuiles 3', tileset, 0, 0);

            // Activer les collisions sur le layer World
            if (worldLayer) {
                worldLayer.setCollisionByProperty({ collision: true });
                console.log('Collisions activated for worldLayer');
                
                // Debug: afficher les collisions
                const debugGraphics = this.add.graphics().setAlpha(0.75);
                worldLayer.renderDebug(debugGraphics, {
                    tileColor: null, // Couleur des tiles sans collision
                    collidingTileColor: new Phaser.Display.Color(243, 134, 48, 255), // Couleur des tiles avec collision
                    faceColor: new Phaser.Display.Color(40, 39, 37, 255) // Couleur des faces des tiles
                });
            } else {
                console.error('Failed to create worldLayer');
            }

            // Création du joueur
            const spawnPoint = this.map.findObject("Calque d'Objets 1", obj => obj.name === "Player");
            const spawnX = spawnPoint ? (spawnPoint.x || 350) : 350;
            const spawnY = spawnPoint ? (spawnPoint.y || 500) : 500;
            
            this.player = this.physics.add.sprite(spawnX, spawnY, 'player');
            this.player.setCollideWorldBounds(true);

            // Ajouter les collisions entre le joueur et le monde
            if (worldLayer) {
                this.physics.add.collider(this.player, worldLayer);
                console.log('Player collisions added with worldLayer');
            }

            // Création de l'ennemi avec la nouvelle fonction
            this.enemy = this.createEnemy(spawnX + 100, spawnY - 200, 1);

            // Création des clés depuis le Calque d'Objets 1
            const keyObjects = this.map.filterObjects("Calque d'Objets 1", obj => obj.name === "Key");
            if (keyObjects) {
                keyObjects.forEach(keyObj => {
                    if (keyObj.x !== undefined && keyObj.y !== undefined) {
                        this.createKey(keyObj.x, keyObj.y);
                    }
                });
            }

            // Création des monstres depuis le Calque d'Objets 2
            const monsterObjects = this.map.filterObjects("Calque d'Objets 2", obj => obj.name === "MonsterHF");
            if (monsterObjects) {
                monsterObjects.forEach(monsterObj => {
                    if (monsterObj.x !== undefined && monsterObj.y !== undefined) {
                        this.createEnemy(monsterObj.x, monsterObj.y, 1);
                    }
                });
            }

            // Écouter les événements de son
            EventBus.on('sound-level', (level: number) => {
                this.currentSoundLevel = level;
            });

            // Création du système d'ombre
            this.createShadowSystem();

            // Création des contrôles
            if (this.input.keyboard) {
                this.cursors = this.input.keyboard.createCursorKeys();
            } else {
                console.error('Keyboard input not available');
                this.cursors = null;
            }

            // La caméra suit le joueur
            if (this.player && this.camera) {
                this.camera.startFollow(this.player, true);
                this.camera.setZoom(1.5);
            }

            // Écouter les changements de valeur du timer
            EventBus.on('timer-update', (value: number) => {
                this.timerValue = value;
            });

            EventBus.emit('current-scene-ready', this);
        } catch (error) {
            console.error('Error creating map:', error);
            return;
        }
    }

    private createShadowSystem() {
        // Créer un grand rectangle noir qui couvre toute la map
        const darkness = this.add.graphics();
        darkness.fillStyle(0x000000, 0.99);
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
        const enemySpeed = 100; // Vitesse de l'ennemi (plus lente que le joueur)
        const mentalDamageDistance = 150; // Distance à laquelle l'ennemi affecte la santé mentale

        if (!this.cursors || !this.player || !this.enemy || !this.input.keyboard) {
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

        // Faire suivre l'ennemi vers le joueur
        const angle = Phaser.Math.Angle.Between(
            this.enemy.x,
            this.enemy.y,
            this.player.x,
            this.player.y
        );

        // Calculer la vélocité de l'ennemi en fonction de son type
        if (this.enemy.enemyType === 1) {
            // Type 1 : ne bouge que si le son est élevé
            const SOUND_MOVEMENT_THRESHOLD = 60;
            if (this.currentSoundLevel > SOUND_MOVEMENT_THRESHOLD) {
                // Plus le son est fort, plus l'ennemi est rapide
                const speedMultiplier = Math.min(this.currentSoundLevel / 50, 2); // Maximum 2x la vitesse normale
                this.enemy.setVelocityX(Math.cos(angle) * enemySpeed * speedMultiplier);
                this.enemy.setVelocityY(Math.sin(angle) * enemySpeed * speedMultiplier);
                
                // Effet visuel quand l'ennemi est activé par le son
                this.enemy.setTint(0xff00ff); // Violet quand activé par le son
            } else {
                // Arrêter l'ennemi si le son est faible
                this.enemy.setVelocity(0, 0);
                this.enemy.setTint(0x0000ff); // Bleu quand inactif
            }
        } else {
            // Autres types : comportement normal
            this.enemy.setVelocityX(Math.cos(angle) * enemySpeed);
            this.enemy.setVelocityY(Math.sin(angle) * enemySpeed);
        }

        // Vérifier la distance entre le joueur et l'ennemi
        const distance = Phaser.Math.Distance.Between(
            this.enemy.x,
            this.enemy.y,
            this.player.x,
            this.player.y
        );

        // Si l'ennemi est proche, accélérer la perte de santé mentale
        if (distance < mentalDamageDistance) {
            // Émettre un événement pour accélérer la diminution du timer
            EventBus.emit('enemy-near');
            
            // Effet visuel sur l'ennemi pour montrer qu'il affecte le joueur
            this.enemy.setTint(0xff0000);
        } else {
            this.enemy.clearTint();
        }

        // Mettre à jour la position de la zone de vision
        if (this.lightCircle && this.player) {
            this.lightCircle.setPosition(this.player.x, this.player.y);
            
            // Effet de "respiration" de la zone de vision
            this.lightCircle.clear();
            this.lightCircle.fillStyle(0xffffff);
            
            // Le rayon dépend maintenant de la valeur du timer
            const baseRadius = 150;
            const radius = baseRadius * (this.timerValue / 100); // Le rayon diminue avec le timer
            
            // Dessiner un cercle plein avec une opacité faible
            this.lightCircle.fillStyle(0xffffff, 0.3);
            this.lightCircle.fillCircle(0, 0, radius);

            this.lightCircle.lineStyle(40, 0x000, 0.01);
            this.lightCircle.strokeCircle(0, 0, radius + 20);
        }

        // Traitement du son du microphone
        this.processMicrophoneInput();
    }

    changeScene ()
    {
        this.scene.start('GameOver');
    }
}
