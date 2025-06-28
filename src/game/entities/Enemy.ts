import { Scene } from 'phaser';

export interface CustomEnemy extends Phaser.Types.Physics.Arcade.SpriteWithDynamicBody {
    enemyType: number;
}

export class Enemy {
    private enemy: CustomEnemy;
    private scene: Scene;
    private target: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    private currentSoundLevel: number = 0;

    constructor(scene: Scene, x: number, y: number, target: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody, type: number = 1) {
        this.scene = scene;
        this.target = target;
        this.enemy = this.createEnemy(x, y, type);
        this.createAnimations();
    }

    private createEnemy(x: number, y: number, type: number): CustomEnemy {
        const enemy = this.scene.physics.add.sprite(x, y, 'enemy') as CustomEnemy;
        enemy.setCollideWorldBounds(true);
        enemy.enemyType = type;
        return enemy;
    }

    private createAnimations() {
        if (!this.scene.anims.exists('enemy_right')) {
            this.scene.anims.create({
                key: 'enemy_right',
                frames: this.scene.anims.generateFrameNumbers('enemy', { start: 0, end: 3 }),
                frameRate: 8,
                repeat: -1
            });

            this.scene.anims.create({
                key: 'enemy_left',
                frames: this.scene.anims.generateFrameNumbers('enemy', { start: 4, end: 7 }),
                frameRate: 8,
                repeat: -1
            });
        }
    }

    public setupCollisions(worldLayer: Phaser.Tilemaps.TilemapLayer) {
        this.scene.physics.add.collider(this.enemy, worldLayer);
        this.scene.physics.add.overlap(this.target, this.enemy);
    }

    public getSprite(): CustomEnemy {
        return this.enemy;
    }

    public setCurrentSoundLevel(level: number) {
        this.currentSoundLevel = level;
    }

    public update() {
        const enemySpeed = 70; // Vitesse de base de l'ennemi

        // Calculer l'angle vers la cible
        const angle = Phaser.Math.Angle.Between(
            this.enemy.x,
            this.enemy.y,
            this.target.x,
            this.target.y
        );

        // Gestion du mouvement selon le type d'ennemi
        if (this.enemy.enemyType === 1) {
            // Type 1 : ne bouge que si le son est élevé
            const SOUND_MOVEMENT_THRESHOLD = 60;
            if (this.currentSoundLevel > SOUND_MOVEMENT_THRESHOLD) {
                // Plus le son est fort, plus l'ennemi est rapide
                const speedMultiplier = Math.min(this.currentSoundLevel / 50, 1.5);
                const velocityX = Math.cos(angle) * enemySpeed * speedMultiplier;
                const velocityY = Math.sin(angle) * enemySpeed * speedMultiplier;
                
                this.enemy.setVelocityX(velocityX);
                this.enemy.setVelocityY(velocityY);

                // Animation selon la direction
                if (velocityX > 0) {
                    this.enemy.anims.play('enemy_right', true);
                } else {
                    this.enemy.anims.play('enemy_left', true);
                }
            } else {
                // Arrêter l'ennemi si le son est faible
                this.enemy.setVelocity(0, 0);
                this.enemy.anims.stop();
            }
        } else {
            // Autres types : comportement normal
            const velocityX = Math.cos(angle) * enemySpeed;
            const velocityY = Math.sin(angle) * enemySpeed;
            
            this.enemy.setVelocityX(velocityX);
            this.enemy.setVelocityY(velocityY);

            // Animation selon la direction
            if (velocityX > 0) {
                this.enemy.anims.play('enemy_right', true);
            } else {
                this.enemy.anims.play('enemy_left', true);
            }
        }
    }

    public getDistanceToTarget(): number {
        return Phaser.Math.Distance.Between(
            this.enemy.x,
            this.enemy.y,
            this.target.x,
            this.target.y
        );
    }
} 