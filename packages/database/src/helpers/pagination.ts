export interface Page<T> {
  items: T[]; total: number; page: number; limit: number;
  pages: number; hasMore: boolean;
}

export function paginate(page = 1, limit = 20) {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(Math.max(1, limit), 200);
  return {
    from: (safePage - 1) * safeLimit,
    to: safePage * safeLimit - 1,
    page: safePage,
    limit: safeLimit,
  };
}

export function buildPage<T>(items: T[], total: number, page: number, limit: number): Page<T> {
  const pages = Math.ceil(total / limit);
  return { items, total, page, limit, pages, hasMore: page < pages };
}
