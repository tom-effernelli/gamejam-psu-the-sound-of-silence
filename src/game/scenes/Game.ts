import { EventBus } from '../EventBus';
import { Scene } from 'phaser';
import { Enemy } from '../entities/Enemy';
import { Music } from './Music';

export class Game extends Scene
{
    private camera: Phaser.Cameras.Scene2D.Camera;
    private map: Phaser.Tilemaps.Tilemap;
    private player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    private enemies: Enemy[] = [];
    private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null;
    private currentSoundLevel: number = 0;
    private key: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    private hasKey: boolean = false;
    
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
    private exclamationSprite: Phaser.GameObjects.Sprite; // Sprite pour l'exclamation

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
        key.setScale(1); // Réduire à 10% de sa taille originale
        
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
        
        // Marquer la clé comme collectée
        this.hasKey = true;
        
        // Émet un événement pour indiquer que la clé a été collectée
        EventBus.emit('key-collected');
        
        // Jouer le son de collecte de clé
        const musicScene = this.scene.get('Music') as Music;
        musicScene.playKeyCollectSound();
        
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
        
        // Chargement du sprite du joueur
        this.load.spritesheet('player', 'assets/Character.png', {
            frameWidth: 32,
            frameHeight: 32
        });

        // Chargement du sprite de l'ennemi
        this.load.spritesheet('enemy', 'assets/Monster1.png', {
            frameWidth: 50,
            frameHeight: 50
        });

        // Chargement de l'icône d'exclamation
        this.load.image('exclamation', 'assets/exclamation.png');

        // Chargement des sons
        this.load.audio('door-locked', 'assets/SD/Player/OpenDoor/OpenWithoutKey.wav');
    }

    private createEnemy(x: number, y: number, type: number = 1): Enemy {
        const enemy = new Enemy(this, x, y, this.player, type);
        const worldLayerInfo = this.map.getLayer('Calque de Tuiles 3');
        if (worldLayerInfo && worldLayerInfo.tilemapLayer) {
            enemy.setupCollisions(worldLayerInfo.tilemapLayer);
        }
        this.enemies.push(enemy);
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
                throw new Error('Failed to add tileset');
            }
            console.log('Tileset added:', tileset);
            
            // Création des layers
            const worldLayer = this.map.createLayer('Calque de Tuiles 1', tileset, 0, 0);
            const decorLayer = this.map.createLayer('Calque de Tuiles 3', tileset, 0, 0);

            // Activer les collisions sur le layer World
            if (worldLayer && decorLayer) {
                worldLayer.setCollisionByProperty({ collision: true });
                decorLayer.setCollisionByProperty({ collision: true });
                console.log('Collisions activated for both layers');
                
                // Debug: afficher les collisions pour worldLayer
/*                const debugGraphics = this.add.graphics().setAlpha(0.75);
                worldLayer.renderDebug(debugGraphics, {
                    tileColor: null,
                    collidingTileColor: new Phaser.Display.Color(243, 134, 48, 255), // Orange vif
                    faceColor: new Phaser.Display.Color(40, 39, 37, 255) // Couleur des faces
                });

                // Debug: afficher les collisions pour decorLayer avec une couleur différente
                const debugGraphics2 = this.add.graphics().setAlpha(0.75);
                decorLayer.renderDebug(debugGraphics2, {
                    tileColor: null,
                    collidingTileColor: new Phaser.Display.Color(255, 0, 0, 255), // Rouge vif pour distinguer
                    faceColor: new Phaser.Display.Color(40, 39, 37, 255) // Couleur des faces
                });*/
            } else {
                console.error('Failed to create layers');
            }

            // Création du joueur
            const spawnPoint = this.map.findObject("Calque d'Objets 1", obj => obj.name === "Player");
            const spawnX = spawnPoint ? (spawnPoint.x || 350) : 350;
            const spawnY = spawnPoint ? (spawnPoint.y || 500) : 500;
            
            this.player = this.physics.add.sprite(spawnX, spawnY, 'player');
            this.player.setScale(1.50);
            this.player.setCollideWorldBounds(true);

            const spriteWidth = this.player.width;
            const spriteHeight = this.player.height;

            // Hitbox = 80% largeur, 20% hauteur en bas
            const hitboxWidth = spriteWidth * 0.8;
            const hitboxHeight = spriteHeight * 0.2;

            const offsetX = (spriteWidth - hitboxWidth) / 2; // centré horizontalement
            const offsetY = spriteHeight - hitboxHeight;     // en bas

            this.player.body.setSize(hitboxWidth, hitboxHeight);
            this.player.body.setOffset(offsetX, offsetY);

            // meow uwu OwO
            // un plan de 25 secondes c'est clean i guess
            // 

            // Création des animations du joueur
            this.anims.create({
                key: 'idle',
                frames: this.anims.generateFrameNumbers('player', { start: 0, end: 3 }),
                frameRate: 8,
                repeat: -1
            });

            this.anims.create({
                key: 'walk_right',
                frames: this.anims.generateFrameNumbers('player', { start: 4, end: 7 }),
                frameRate: 8,
                repeat: -1
            });

            this.anims.create({
                key: 'walk_left',
                frames: this.anims.generateFrameNumbers('player', { start: 8, end: 11 }),
                frameRate: 8,
                repeat: -1
            });

            // Ajouter les collisions entre le joueur et le monde
            if (worldLayer && decorLayer) {
                this.physics.add.collider(this.player, worldLayer);
                this.physics.add.collider(this.player, decorLayer);
                console.log('Player collisions added with both layers');
            }

            // Création du premier ennemi
            this.createEnemy(spawnX + 300, spawnY, 1);

            // Création des clés depuis le Calque d'Objets 1
            const keyObjects = this.map.filterObjects("Calque d'Objets 1", obj => obj.name === "Key");
            if (keyObjects) {
                keyObjects.forEach(keyObj => {
                    if (keyObj.x !== undefined && keyObj.y !== undefined) {
                        this.createKey(keyObj.x, keyObj.y);
                    }
                });
            }

            // Création des monstres supplémentaires depuis le Calque d'Objets 2
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

            // Écouter les événements de son
            EventBus.on('sound-level', (level: number) => {
                this.currentSoundLevel = level;
            });

            // Création de l'exclamation sprite (maintenant positionnée au-dessus du premier ennemi)
            if (this.enemies.length > 0) {
                const firstEnemy = this.enemies[0].getSprite();
                this.exclamationSprite = this.add.sprite(firstEnemy.x, firstEnemy.y, 'exclamation').setScale(0.1);
            } else {
                // Fallback position si aucun ennemi n'est présent
                this.exclamationSprite = this.add.sprite(spawnX + 300, spawnY, 'exclamation').setScale(0.1);
            }

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
        const mentalDamageDistance = 150;

        if (!this.cursors || !this.player || !this.input.keyboard) {
            return;
        }

        // Vérifier si le joueur est près de la porte
        const doorObject = this.map.findObject("Calque d'Objets 1", obj => obj.name === "Door");
        if (doorObject && doorObject.x !== undefined && doorObject.y !== undefined) {
            const distanceToDoor = Phaser.Math.Distance.Between(
                this.player.x,
                this.player.y,
                doorObject.x,
                doorObject.y
            );
            
            if (distanceToDoor < 50) {
                if (this.hasKey) {
                    // Jouer le son de porte qui s'ouvre
                    const musicScene = this.scene.get('Music') as Music;
                    if (musicScene && musicScene.isSceneReady()) {
                        console.log('Playing door open sound...');
                        musicScene.playDoorOpenSound();
                    }
                    EventBus.emit('reset-timer');  // Reset la vie à 100 avant de changer de scène
                    this.scene.start('Game2');
                    return;
                } else {
                    // Jouer le son de porte verrouillée
                    const musicScene = this.scene.get('Music') as Music;
                    if (musicScene && musicScene.isSceneReady()) {
                        console.log('Playing door locked sound from Game scene...');
                        musicScene.playDoorLockedSound();
                    } else {
                        console.warn('Music scene not ready');
                    }
                }
            }
        }

        // Déplacement horizontal
        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-speed);
            this.player.anims.play('walk_left', true);
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(speed);
            this.player.anims.play('walk_right', true);
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

        // Si le joueur ne bouge pas, jouer l'animation idle
        if (this.player.body.velocity.x === 0 && this.player.body.velocity.y === 0) {
            this.player.anims.play('idle', true);
        }

        // Normaliser la vitesse en diagonale
        if (this.player.body) {
            this.player.body.velocity.normalize().scale(speed);
        }

        // Mettre à jour tous les ennemis
        for (const enemy of this.enemies) {
            enemy.setCurrentSoundLevel(this.currentSoundLevel);
            enemy.update();
            
            // Vérifier la distance pour chaque ennemi
            const distance = enemy.getDistanceToTarget();
            if (distance < mentalDamageDistance) {
                EventBus.emit('enemy-near');
                this.exclamationSprite.setVisible(true);
                this.exclamationSprite.setPosition(this.player.x, this.player.y - 50);
            } else {
                this.exclamationSprite.setVisible(false);
            }
        }

        // Mettre à jour la position de la zone de vision
        if (this.lightCircle && this.player) {
            this.lightCircle.setPosition(this.player.x, this.player.y);
            
            this.lightCircle.clear();
            this.lightCircle.fillStyle(0xffffff);
            
            const baseRadius = 150;
            const radius = baseRadius * (this.timerValue / 100);
            
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
        EventBus.emit('reset-timer');  // Reset la vie à 100
        this.scene.start('GameOver');
    }
}
