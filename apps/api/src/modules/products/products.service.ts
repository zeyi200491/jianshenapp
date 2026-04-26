import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/utils/app.exception';
import { serializeValue } from '../../common/utils/serialize.util';
import type { ProductQueryDto } from './dto/product-query.dto';
import { ProductsRepository } from './products.repository';

function parseJsonArray(value: string[] | string | null | undefined): string[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

@Injectable()
export class ProductsService {
  constructor(private readonly productsRepository: ProductsRepository) {}

  async list(query: ProductQueryDto) {
    const [categories, products] = await Promise.all([
      this.productsRepository.findCategories(),
      this.productsRepository.findProducts(query),
    ]);

    return serializeValue({
      categories: categories.map((category: { id: string; name: string; slug: string }) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
      })),
      products: products.map((product: {
        id: string;
        name: string;
        subtitle: string;
        description: string;
        price_cents: number;
        cover_image_url: string;
        target_tags: string[] | string;
        scene_tags: string[] | string;
        category_id: string;
        category_name: string;
        category_slug: string;
      }) => ({
        id: product.id,
        name: product.name,
        subtitle: product.subtitle,
        description: product.description,
        priceCents: product.price_cents,
        coverImageUrl: product.cover_image_url,
        targetTags: parseJsonArray(product.target_tags),
        sceneTags: parseJsonArray(product.scene_tags),
        category: {
          id: product.category_id,
          name: product.category_name,
          slug: product.category_slug,
        },
      })),
    });
  }

  async getDetail(id: string) {
    const product = await this.productsRepository.findById(id);
    if (!product) {
      throw new AppException('NOT_FOUND', '商品不存在', 404);
    }

    return serializeValue({
      id: product.id,
      name: product.name,
      subtitle: product.subtitle,
      description: product.description,
      priceCents: product.price_cents,
      coverImageUrl: product.cover_image_url,
      detailImages: parseJsonArray(product.detail_images),
      targetTags: parseJsonArray(product.target_tags),
      sceneTags: parseJsonArray(product.scene_tags),
      category: {
        id: product.category_id,
        name: product.category_name,
        slug: product.category_slug,
      },
    });
  }
}