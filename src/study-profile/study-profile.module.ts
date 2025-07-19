import { Module } from '@nestjs/common';
import { StudyProfileController } from './study-profile.controller';
import { StudyProfileService } from './study-profile.service';

@Module({
  controllers: [StudyProfileController],
  providers: [StudyProfileService]
})
export class StudyProfileModule {}
