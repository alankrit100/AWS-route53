from math import ceil


def paginate(query, page: int = 1, size: int = 20):
    if page < 1:
        page = 1
    if size < 1:
        size = 20
    if size > 100:
        size = 100

    total = query.count()
    items = query.offset((page - 1) * size).limit(size).all()
    total_pages = max(1, ceil(total / size))

    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "total_pages": total_pages,
    }
