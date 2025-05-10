import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { UpdateUserDto } from './dto/user.dto';

@Injectable()
export class UserService {
  constructor(@InjectRepository(User) private readonly userRepository: Repository<User>,) {
  }

  public async findOneByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOneBy({ email });
  }

  public async updateUser(
    id: string,
    updateUser: UpdateUserDto,
  ): Promise<User | null> {
    try {
      const toUpdate: User | null = await this.userRepository.findOneBy({ id });
      if (!toUpdate) {
        return null;
      }
      const updated = Object.assign(toUpdate, updateUser);
      return await this.userRepository.save(updated);
    } catch (err) {
      return null;
    }
  }
}
