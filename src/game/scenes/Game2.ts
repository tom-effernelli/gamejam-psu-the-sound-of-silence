import { EventBus } from '../EventBus';
import { Scene } from 'phaser';
import { Enemy } from '../entities/Enemy';
import { Music } from './Music';

// Interface pour l'ennemi
interface CustomEnemy extends Phaser.Types.Physics.Arcade.SpriteWithDynamicBody {
    enemyType: number;
}

export class Game2 extends Scene
{
    private camera: Phaser.Cameras.Scene2D.Camera;
    private map: Phaser.Tilemaps.Tilemap;
    private player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    private enemies: Enemy[] = [];
    private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null;
    private currentSoundLevel: number = 0;
    private key: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    private exclamationSprite: Phaser.GameObjects.Sprite;
    
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
    private doorPositions: Array<{x: number, y: number}> = [];

    constructor ()
    {
        super('Game2');  // Changed scene key to 'Game2'
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
        this.load.tilemapTiledJSON('map2', 'assets/Level2.tmj');
        console.log('Loading tileset...');
        this.load.image('tiles', 'assets/Environment.png');
        console.log('Assets loaded in preload');
        
        this.load.spritesheet('player', 'assets/Character.png', {
            frameWidth: 32,
            frameHeight: 32
        });

        // Chargement du sprite de l'ennemi
        this.load.spritesheet('enemy', 'assets/Monster1.png', {
            frameWidth: 50,
            frameHeight: 50
        });

        // Chargement du sprite du deuxième type d'ennemi
        this.load.spritesheet('Monster2', 'assets/Monster2.png', {
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

    private cleanup() {
        // Arrêter tous les sons
        this.sound.stopAll();
        
        // Nettoyer les événements
        this.events.off('update');
        this.events.off('destroy');
        EventBus.emit('reset-timer');

        // Nettoyer les collisions
        if (this.physics.world) {
            this.physics.world.colliders.destroy();
        }

        // Nettoyer les ennemis
        this.enemies.forEach(enemy => {
            const sprite = enemy.getSprite();
            if (sprite) {
                sprite.destroy();
            }
        });
        this.enemies = [];

        // Nettoyer le joueur
        if (this.player) {
            this.player.destroy();
        }
    }

    private createDoorSprites() {
        // Trouver tous les objets "Door" dans le calque d'objets
        const doorObjects = this.map.filterObjects("Calque d'Objets 1", obj => obj.name === "Door");
        
        if (doorObjects) {
            doorObjects.forEach(door => {
                if (door.x !== undefined && door.y !== undefined) {
                    // Créer un rectangle noir pour chaque porte
                    /*const doorSprite = this.add.rectangle(door.x+40, door.y-45, 48, 48, 0x000000);
                    doorSprite.setOrigin(0, 0); // Définir l'origine en haut à gauche
                    doorSprite.setDepth(1); // S'assurer que le sprite est au-dessus du sol mais en-dessous de l'ombre
                    */
                }
            });
        }
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
            this.map = this.make.tilemap({ key: 'map2' });  // Changed map key
            if (!this.map) {
                throw new Error('Failed to create tilemap');
            }
            console.log('Tilemap created:', this.map);
            
            // Ajout du tileset à la map
            console.log('Adding tileset...');
            const tileset = this.map.addTilesetImage('dungeonV3', 'tiles');
            if (!tileset) {
                throw new Error('Failed to add tileset');
            }
            console.log('Tileset added:', tileset);
            
            // Création des layers
            const worldLayer = this.map.createLayer('Calque de Tuiles 1', tileset, 0, 0);
            const decorLayer = this.map.createLayer('Calque de Tuiles 3', tileset, 0, 0);
            const meublesLayer = this.map.createLayer('Calque de Tuiles 2', tileset, 0, 0);

            // Activer les collisions sur le layer World
            if (worldLayer && decorLayer && meublesLayer) {
                worldLayer.setCollisionByProperty({ collision: true });
                decorLayer.setCollisionByProperty({ collision: true });
                meublesLayer.setCollisionByProperty({ collision: true });
                console.log('Collisions activated for both layers');
            } else {
                console.error('Failed to create layers');
            }

            // Création des sprites de portes (sans les collisions pour l'instant)
            this.createDoorSprites();

            // Création du joueur
            const spawnPoint = this.map.findObject("Calque d'Objets 1", obj => obj.name === "Player");
            const spawnX = spawnPoint ? (spawnPoint.x || 350) : 350;
            const spawnY = spawnPoint ? (spawnPoint.y || 700) : 700;
            
            this.player = this.physics.add.sprite(spawnX, spawnY, 'player');
            this.player.setScale(1.50);
            this.player.setCollideWorldBounds(true);
            const spriteWidth = this.player.width;
            const spriteHeight = this.player.height;

            // Hitbox = 80% largeur, 20% hauteur en bas
            const hitboxWidth = spriteWidth * 0.5;
            const hitboxHeight = spriteHeight * 0.2;

            const offsetX = (spriteWidth - hitboxWidth) / 2; // centré horizontalement
            const offsetY = spriteHeight - hitboxHeight;     // en bas

            this.player.body.setSize(hitboxWidth, hitboxHeight);
            this.player.body.setOffset(offsetX, offsetY);

            // Création des animations du joueur
            this.createPlayerAnimations();

            // Ajouter les collisions entre le joueur et le monde
            if (worldLayer && decorLayer && meublesLayer) {
                this.physics.add.collider(this.player, worldLayer);
                this.physics.add.collider(this.player, decorLayer);
                this.physics.add.collider(this.player, meublesLayer);
                console.log('Player collisions added with both layers');
            }

            // Création des clés
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

            const monsterObjects2 = this.map.filterObjects("Calque d'Objets 2", obj => obj.name === "MonsterLF");
            if (monsterObjects2) {
                monsterObjects2.forEach(monsterObj => {
                    if (monsterObj.x !== undefined && monsterObj.y !== undefined) {
                        this.createEnemy(monsterObj.x, monsterObj.y, 0);
                    }
                });
            }


            // Création de l'exclamation sprite
            this.exclamationSprite = this.add.sprite(spawnX, spawnY - 50, 'exclamation')
                .setScale(0.1)
                .setVisible(false);

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

    private createPlayerAnimations() {
        this.anims.create({
            key: 'walk_down',
            frames: this.anims.generateFrameNumbers('player', { start: 0, end: 1 }),
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: 'walk_left',
            frames: this.anims.generateFrameNumbers('player', { start: 2, end: 3 }),
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: 'walk_right',
            frames: this.anims.generateFrameNumbers('player', { start: 4, end: 5 }),
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: 'walk_up',
            frames: this.anims.generateFrameNumbers('player', { start: 6, end: 7 }),
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: 'idle',
            frames: [{ key: 'player', frame: 0 }],
            frameRate: 1
        });
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
        // Vérifier si le joueur est près de la porte
        if (!this.player || !this.player.body) {
            return;
        }

        if (this.map) {  // Vérifier que la carte est chargée
            const doorObject = this.map.findObject("Calque d'Objets 1", obj => obj.name === "Door");
            if (doorObject && doorObject.x !== undefined && doorObject.y !== undefined) {
                const distanceToDoor = Phaser.Math.Distance.Between(
                    this.player.x,
                    this.player.y,
                    doorObject.x+40,
                    doorObject.y-45
                );
                
                if (distanceToDoor < 50) {
                    // Nettoyer la scène avant la transition
                    this.cleanup();
                    // Démarrer Game3
                    this.scene.start('Game3');
                    return;
                }
            }
        }

        // Gestion des déplacements du joueur
        const speed = 175;
        const mentalDamageDistance = 75;

        if (!this.cursors || !this.input.keyboard) {
            return;
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
            this.player.anims.play('walk_up', true);
        } else if (this.cursors.down.isDown) {
            this.player.setVelocityY(speed);
            this.player.anims.play('walk_down', true);
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

        // Mise à jour des ennemis
        let isEnemyNear = false;
        for (const enemy of this.enemies) {
            const sprite = enemy.getSprite();
            if (!sprite || !sprite.body) {
                continue;  // Skip this enemy if sprite is not valid
            }
            
            enemy.setCurrentSoundLevel(this.currentSoundLevel);
            enemy.update();
            
            const distance = enemy.getDistanceToTarget();
            if (distance < mentalDamageDistance) {
                EventBus.emit('enemy-near');
                isEnemyNear = true;
            }
        }

        // Mise à jour de l'exclamation
        if (this.exclamationSprite) {
            if (isEnemyNear) {
                this.exclamationSprite.setVisible(true);
                this.exclamationSprite.setPosition(this.player.x, this.player.y - 50);
            } else {
                this.exclamationSprite.setVisible(false);
            }
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
        EventBus.emit('reset-timer');  // Reset la vie à 100
        this.scene.start('GameOver');
    }
} 