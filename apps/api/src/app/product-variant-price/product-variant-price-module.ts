import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { ProductVariantPrice } from './product-variant-price.entity';
import { ProductVariantPriceController } from './product-variant-price.controller';
import { ProductVariantPriceService } from './product-variant-price.service';
import { TenantModule } from '../tenant/tenant.module';

@Module({
	imports: [TypeOrmModule.forFeature([ProductVariantPrice]), TenantModule],
	controllers: [ProductVariantPriceController],
	providers: [ProductVariantPriceService],
	exports: [ProductVariantPriceService]
})
export class ProductVariantPriceModule {}
