import { BaseEntity, Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity()
@Index(['forkedFrom', 'forkedBy'], { unique: true })
export class Fork extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ nullable: false })
  @Index()
  forkedFrom!: number;

  @Column({ nullable: false })
  @Index({ unique: true })
  forkedTo!: number;

  @Column({ nullable: false })
  @Index()
  forkedBy!: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
