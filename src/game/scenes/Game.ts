import { EventBus } from '../EventBus';
import { Scene } from 'phaser';

export class Game extends Scene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    map: Phaser.Tilemaps.Tilemap;
    player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    cursors: Phaser.Types.Input.Keyboard.CursorKeys;

    constructor ()
    {
        super('Game');
    }

    preload ()
    {
        // Chargement de la tilemap et du tileset
        this.load.tilemapTiledJSON('map', 'assets/tuxemon-town.json');
        this.load.image('tiles', 'assets/tuxmon-sample-32px-extruded.png');
        
        // Chargement du sprite du joueur (un carré rouge pour l'instant)
        this.load.image('player', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAGklEQVRYR+3BAQEAAACCIP+vbkhAAQAAAO8GECAAAZf3V9cAAAAASUVORK5CYII=');
    }

    create ()
    {
        // Active la physique Arcade
        this.physics.world.setBounds(0, 0, 1280, 1280);

        this.camera = this.cameras.main;
        
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
    }

    changeScene ()
    {
        this.scene.start('GameOver');
    }
}
