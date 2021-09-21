import { MigrationInterface, QueryRunner } from 'typeorm';

export class TextSearchIndexFlashcard1632240273828 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`create index txt_search on flashcard using GIN (to_tsvector('english', title))`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('drop index txt_search');
  }
}
