-- English names for the 60 pre-seeded foods.
-- Coach-created foods (is_preset=false) keep name_en NULL and fall back to `name`.

-- Meso / Riba (Meat / Fish)
update foods set name_en = 'Chicken breast'           where name = 'Piletina prsa';
update foods set name_en = 'Chicken thigh'            where name = 'Piletina batak';
update foods set name_en = 'Turkey breast'            where name = 'Puretina prsa';
update foods set name_en = 'Ground beef (10% fat)'    where name = 'Govedina mljevena (10% masti)';
update foods set name_en = 'Beef steak'               where name = 'Govedina biftek';
update foods set name_en = 'Pork tenderloin'          where name = 'Svinjetina file';
update foods set name_en = 'Canned tuna (in water)'   where name = 'Tuna (konzerva u vodi)';
update foods set name_en = 'Salmon'                   where name = 'Losos';
update foods set name_en = 'White fish (hake)'        where name = 'Bijela riba (oslić)';
update foods set name_en = 'Shrimp'                   where name = 'Škampi';

-- Jaja (Eggs)
update foods set name_en = 'Eggs (whole)'             where name = 'Jaja (cijela)';
update foods set name_en = 'Egg whites'               where name = 'Bjelanjak';

-- Mliječni (Dairy)
update foods set name_en = 'Milk (1.5%)'              where name = 'Mlijeko (1.5%)';
update foods set name_en = 'Yogurt (plain)'           where name = 'Jogurt (prirodni)';
update foods set name_en = 'Skyr'                     where name = 'Skyr';
update foods set name_en = 'Cottage cheese'           where name = 'Sir cottage';
update foods set name_en = 'Gouda cheese'             where name = 'Sir gauda';
update foods set name_en = 'Mozzarella'               where name = 'Mozzarella';
update foods set name_en = 'Whey protein (powder)'    where name = 'Whey protein (prah)';
update foods set name_en = 'Greek yogurt (0%)'        where name = 'Grčki jogurt (0%)';

-- Žitarice (Grains)
update foods set name_en = 'White rice (cooked)'      where name = 'Riža bijela (kuhana)';
update foods set name_en = 'Brown rice (cooked)'      where name = 'Riža smeđa (kuhana)';
update foods set name_en = 'Rolled oats'              where name = 'Zobene pahuljice';
update foods set name_en = 'Whole wheat bread'        where name = 'Kruh integralni';
update foods set name_en = 'Pasta (cooked)'           where name = 'Tjestenina (kuhana)';
update foods set name_en = 'Couscous (cooked)'        where name = 'Kuskus (kuhan)';
update foods set name_en = 'Quinoa (cooked)'          where name = 'Kinoa (kuhana)';
update foods set name_en = 'Tortilla (wheat)'         where name = 'Tortilja (pšenična)';

-- Mahunarke (Legumes)
update foods set name_en = 'Lentils (cooked)'         where name = 'Leća (kuhana)';
update foods set name_en = 'Beans (cooked)'           where name = 'Grah (kuhan)';
update foods set name_en = 'Chickpeas (cooked)'       where name = 'Slanutak (kuhan)';
update foods set name_en = 'Edamame'                  where name = 'Edamame';

-- Voće (Fruit)
update foods set name_en = 'Banana'                   where name = 'Banana';
update foods set name_en = 'Apple'                    where name = 'Jabuka';
update foods set name_en = 'Orange'                   where name = 'Naranča';
update foods set name_en = 'Strawberries'             where name = 'Jagode';
update foods set name_en = 'Blueberries'              where name = 'Borovnice';
update foods set name_en = 'Kiwi'                     where name = 'Kivi';

-- Povrće (Vegetables)
update foods set name_en = 'Broccoli'                 where name = 'Brokula';
update foods set name_en = 'Spinach'                  where name = 'Špinat';
update foods set name_en = 'Tomato'                   where name = 'Rajčica';
update foods set name_en = 'Cucumber'                 where name = 'Krastavac';
update foods set name_en = 'Bell pepper (red)'        where name = 'Paprika (crvena)';
update foods set name_en = 'Carrot'                   where name = 'Mrkva';
update foods set name_en = 'Potato'                   where name = 'Krumpir';
update foods set name_en = 'Sweet potato'             where name = 'Batat';
update foods set name_en = 'Zucchini'                 where name = 'Tikvice';
update foods set name_en = 'Onion'                    where name = 'Luk';

-- Masti / Ulja (Fats / Oils)
update foods set name_en = 'Olive oil'                where name = 'Maslinovo ulje';
update foods set name_en = 'Butter'                   where name = 'Maslac';
update foods set name_en = 'Almonds'                  where name = 'Bademi';
update foods set name_en = 'Peanut butter'            where name = 'Kikiriki maslac';
update foods set name_en = 'Avocado'                  where name = 'Avokado';
update foods set name_en = 'Walnuts'                  where name = 'Orasi';
update foods set name_en = 'Coconut oil'              where name = 'Kokosovo ulje';

-- Ostalo (Other)
update foods set name_en = 'Honey'                    where name = 'Med';
update foods set name_en = 'Dark chocolate (70%)'     where name = 'Tamna čokolada (70%)';
update foods set name_en = 'Hummus'                   where name = 'Hummus';
update foods set name_en = 'Mayonnaise'               where name = 'Majoneza';
