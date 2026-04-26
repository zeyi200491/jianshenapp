import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { ProductQueryDto } from './dto/product-query.dto';

interface ProductCategoryRow {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
}

interface ProductRow {
  id: string;
  category_id: string;
  category_name: string;
  category_slug: string;
  name: string;
  subtitle: string;
  description: string;
  target_tags: string[] | string;
  scene_tags: string[] | string;
  price_cents: number;
  cover_image_url: string;
  detail_images: string[] | string;
  status: string;
  sort_order: number;
}

interface RawExecutor {
  $queryRawUnsafe<T>(query: string, ...values: unknown[]): Promise<T>;
}

@Injectable()
export class ProductsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private get raw(): RawExecutor {
    return this.prisma as unknown as RawExecutor;
  }

  findCategories() {
    return this.raw.$queryRawUnsafe<ProductCategoryRow[]>(`
      SELECT id, name, slug, sort_order
      FROM product_categories
      ORDER BY sort_order ASC, created_at ASC
    `);
  }

  async findProducts(query: ProductQueryDto) {
    const conditions = [`p.status = 'active'`];
    const values: unknown[] = [];

    if (query.category) {
      values.push(query.category);
      conditions.push(`c.slug = $${values.length}`);
    }

    if (query.targetType) {
      values.push(JSON.stringify([query.targetType]));
      conditions.push(`p.target_tags @> $${values.length}::jsonb`);
    }

    if (query.scene) {
      values.push(JSON.stringify([query.scene]));
      conditions.push(`p.scene_tags @> $${values.length}::jsonb`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    return this.raw.$queryRawUnsafe<ProductRow[]>(
      `
        SELECT
          p.id,
          p.category_id,
          c.name AS category_name,
          c.slug AS category_slug,
          p.name,
          p.subtitle,
          p.description,
          p.target_tags,
          p.scene_tags,
          p.price_cents,
          p.cover_image_url,
          p.detail_images,
          p.status,
          p.sort_order
        FROM products p
        INNER JOIN product_categories c ON c.id = p.category_id
        ${whereClause}
        ORDER BY c.sort_order ASC, p.sort_order ASC, p.created_at ASC
      `,
      ...values,
    );
  }

  async findById(id: string) {
    const rows = await this.raw.$queryRawUnsafe<ProductRow[]>(
      `
        SELECT
          p.id,
          p.category_id,
          c.name AS category_name,
          c.slug AS category_slug,
          p.name,
          p.subtitle,
          p.description,
          p.target_tags,
          p.scene_tags,
          p.price_cents,
          p.cover_image_url,
          p.detail_images,
          p.status,
          p.sort_order
        FROM products p
        INNER JOIN product_categories c ON c.id = p.category_id
        WHERE p.id = $1::uuid AND p.status = 'active'
        LIMIT 1
      `,
      id,
    );

    return rows[0] ?? null;
  }
}
