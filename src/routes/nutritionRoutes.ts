import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middlewares/authMiddleware';
import { getMeals, getNutritionMenu, orderMenu, cancelOrderMenu } from '../controllers/nutritionController';

export const nutritionRoutes = new Elysia({ prefix: '/api/v1' })
    .use(authMiddleware)
    .get('/nutrition-menu', getNutritionMenu)
    .get('/meals', getMeals)
    .post('/order-menu', orderMenu, {
        body: t.Array(t.Object({
            admission_list_id: t.Number(),
            an: t.String(),
            ward: t.String(),
            order_date: t.String(),
            meal: t.Number(),
            food_item_id: t.Number(),
            request_by: t.Number(),
            addon: t.Optional(t.String())
        }))
    })
    .post('/cancel-order-menu', cancelOrderMenu, {
        body: t.Array(t.Object({
            food_order_id: t.Number()
        }))
    });
