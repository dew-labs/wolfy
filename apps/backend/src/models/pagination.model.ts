import { t, type TSchema } from "elysia";


const Paginate = <T extends TSchema>(schema: T) => t.Object({
    page: t.Number(),
    limit: t.Number(),
    count: t.Number(),
    totalPages: t.Number(),
    data: t.Array(schema),
});

export default Paginate;
