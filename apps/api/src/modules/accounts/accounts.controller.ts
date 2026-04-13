import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { Prisma } from 'database';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  create(@Body() createAccountDto: Prisma.AccountUncheckedCreateInput) {
    return this.accountsService.create(createAccountDto);
  }

  @Get()
  findAll(
    @Query('group') group?: string,
    @Query('search') search?: string,
  ) {
    return this.accountsService.findAll(group, search);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.accountsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAccountDto: Prisma.AccountUpdateInput) {
    return this.accountsService.update(id, updateAccountDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.accountsService.remove(id);
  }
}
