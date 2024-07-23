<?php

Class Documents
{


    private static $conn = false;   //  ссылка на подключение в БД
    private static $errors = [      //  шаблоны ошибок
        'conn'  => 'Не удалось подключиться к БД',
        'query' => 'Ошибка выполнения запроса БД',
        'param' => 'Ошибка параметров запроса API'
    ];


    //  подключение к БД
    private static function db_connect()
    {
        if (self::$conn) return false;
        self::$conn = @mysqli_connect(DB_HOST, DB_USER, DB_PASS, DB_BASE, DB_PORT);
        if (!self::$conn) {
            throw new Exception(self::$errors['conn'] . ': ' . mysqli_connect_error(), mysqli_connect_errno());
        }
    }


    //  выполнение запроса в БД
    private static function query($sql)
    {
        //  инициализация подключения к БД
            self::db_connect();

        //  выполнение запроса
            $result = mysqli_query(self::$conn, $sql);
            if (mysqli_error(self::$conn)) {
                throw new Exception(self::$errors['query'] . ": " . mysqli_error(self::$conn), mysqli_errno(self::$conn));
            }

        //  --->
            return $result;
    }


    //  управление транзакцией
    private static function transaction($operation)
    {
        //  инициализация подключения к БД
            self::db_connect();

        //  управление транзакцией
            switch ($operation) {
                case 'start':
                    mysqli_autocommit(self::$conn, false);
                    mysqli_begin_transaction(self::$conn);
                    break;
                case 'commit':
                    mysqli_commit(self::$conn);
                    break;
                case 'rollback':
                    mysqli_rollback(self::$conn);
                    break;
            }

        //  --->
            return true;
    }


    //  валидация параметров пагинации для списка
    private static function validPagination($pg)
    {
        //  инициализация
            $pg = [
                'current'   => (int) ($pg['current'] ?? 1), //  текущая страница
                'total'     => 0,                           //  всего страниц
                'view'      => (int) ($pg['view'] ?? 10),   //  кол-во элементов на странице
                'view_arr'  => [10, 20, 50]                 //  варианты кол-ва элементов
            ];

        //  проверка допустимости значения view
            if (!in_array($pg['view'], $pg['view_arr'])) $pg['view'] = $pg['view_arr'][0];

        //  расчет параметра total
            $data = self::query("SELECT COUNT(`id`) AS `id` FROM `master`");
            $data = (int) mysqli_fetch_all($data, MYSQLI_ASSOC)[0]['id'];
            $pg['total'] = ceil($data / $pg['view']) ?: 1;

        //  проверка корректности значения current
            if ($pg['current'] < 1) $pg['current'] = 1;
            if ($pg['current'] > $pg['total']) $pg['current'] = $pg['total'];

        //  --->
            return $pg;
    }


    //  валидация данных документа
    private static function validDataDoc(&$data)
    {
        //  устранение крайних пробелов
            foreach ($data as $k => $e) {
                if ($k == 'detail') {
                    foreach ($data[$k] as $i => $d) {
                        $data[$k][$i]['name'] = trim($d['name']);
                        $data[$k][$i]['price'] = trim($d['price']);
                    }
                } else {
                    $data[$k] = trim($data[$k]);
                }
            }

        //  идентификатор
            if (empty($data['id'])) $data['id'] = '';

        //  номер документа
            if (empty($data['number'])) return 'Не указан номер документа';
        
        //  дата документа
            if (empty($data['date'])) return 'Не указана дата документа';
            $d = explode('-', $data['date']);
            $a = checkdate((int) $d[1], (int) $d[2], (int) $d[0]);
            $b = $data['date'] < '2000-01-01';
            $c = $data['date'] > '2100-01-01';
            if (!$a || $b || $c) return 'Дата указана некорректно';
        
        //  список спецификаций
            if (empty($data['detail'])) $data['detail'] = [];
            $test = [];
            foreach ($data['detail'] as $e) {
                if (empty($e['name'])) return 'Не заполнено наименование спецификации';
                if (empty($e['price'])) $e['price'] = '0';
                if ((float) $e['price'] < 0) return 'Не указана сумма для спецификации';
                if (in_array($e['name'], $test)) return 'В списке спецификаций присутствуют дубликаты';
                $test[] = $e['name'];
            }
    }


    //  запрос списка документов
    public static function list($query)
    {
        //  пагинация
            $pg = self::validPagination($query['pagination'] ?? []);

        //  подготовка запроса
            $limit = ($pg['current'] - 1) * $pg['view'];
            $offset = $pg['view'];
            $sql = "
                SELECT
                    `m`.`id`,
                    `m`.`number`,
                    `m`.`date`,
                    `m`.`total`,
                    `m`.`comment`,
                    `d`.`name`,
                    `d`.`price`
                FROM (
                    SELECT * FROM `master`
                    ORDER BY `id` DESC
                    LIMIT {$limit}, {$offset}
                ) AS `m`
                LEFT JOIN `detail` AS `d` ON `d`.`id_master` = `m`.`id`
                ORDER BY `m`.`id` DESC
            ";

        //  выполнение запроса и обработка результата
            $res = [];
            $res_db = mysqli_fetch_all(self::query($sql), MYSQLI_ASSOC);
            foreach ($res_db as $row) {
                $res[$row['id']]['id'] = $row['id'];
                $res[$row['id']]['number'] = $row['number'];
                $res[$row['id']]['date'] = $row['date'];
                $res[$row['id']]['total'] = number_format($row['total'], 2, '.', '');
                $res[$row['id']]['comment'] = $row['comment'];
                if ($row['name']) {
                    $res[$row['id']]['detail'][] = [
                        'name' => $row['name'],
                        'price' => number_format($row['price'], 2, '.', '')
                    ];
                }
            }

        //  --->
            return [
                'list' => array_values([...$res]),
                'pagination' => $pg
            ];
    }


    //  сохранение (добавление, изменение) документа
    public static function save($query)
    {
        //  инициализация подключения к БД
            self::db_connect();

        //  проверка входящих параметров
            $error = self::validDataDoc($query['doc']);
            if ($error) {
                throw new Exception(self::$errors['param'] . ': ' . $error, 1);
            }

        //  экранирование данных
            $sql = [];
            foreach ($query['doc'] as $k => $e) {
                if ($k == 'detail') {
                    foreach ($query['doc'][$k] as $i => $d) {
                        $sql[$k][$i]['name'] = mysqli_real_escape_string(self::$conn, $d['name']);
                        $sql[$k][$i]['price'] = mysqli_real_escape_string(self::$conn, $d['price']);
                    }
                } else {
                    $sql[$k] = mysqli_real_escape_string(self::$conn, $e);
                }
            }

        //  старт транзакции
            self::transaction('start');

        //  сохранение документа
            try {
                if ($sql['id']) {
                    //  обновление существующего документа
                    self::query("
                        UPDATE `master`
                        SET `number` = '{$sql['number']}',
                            `date` = '{$sql['date']}',
                            `comment` = '{$sql['comment']}',
                            `date_created` = NOW()
                        WHERE `id` = '{$sql['id']}'
                    ;");
                    if (mysqli_affected_rows(self::$conn) == 0) {
                        throw new Exception("Документ не существует!", '1');
                    }
                    $id_master = $sql['id'];
                } else {
                    //  создание нового документа
                    self::query("
                        INSERT INTO `master` (`number`, `date`, `comment`) 
                        VALUES ('{$sql['number']}', '{$sql['date']}', '{$sql['comment']}')
                    ;");
                    $id_master = mysqli_insert_id(self::$conn);
                }
            } catch(Throwable $e) {
                //  обработка ошибки
                self::transaction('rollback');
                $message = $e->getMessage();
                if ($e->getCode() === 1062) {
                    $message = "Документ с номеров {$query['doc']['number']} уже существует!";
                    self::query("
                        INSERT INTO `log` (`message`) 
                        VALUES ('Попытка присвоить документу существующий номер');
                    ");
                    self::transaction('commit');
                }
                throw new Exception($message, $e->getCode());
            }

        //  удаление "старой" спецификации 
            if ($sql['id']) {
                self::query("DELETE FROM `detail` WHERE `id_master` = '{$id_master}';");
            }

        //  сохранение "новой" спецификации
            if (!empty($sql['detail'])) {
                $sql_value = [];
                foreach ($sql['detail'] as $k => $e) {
                    $name_hash = md5($e['name']);
                    $sql_value[] = "('{$e['name']}', '{$e['price']}', '{$name_hash}', '{$id_master}')";
                }
                try {
                    self::query("
                        INSERT INTO `detail` (`name`, `price`, `name_hash`, `id_master`) 
                        VALUES " . implode(", ", $sql_value) . "
                    ;");
                } catch(Throwable $e) {
                    //  обработка ошибки
                    self::transaction('rollback');
                    $message = $e->getMessage();
                    if ($e->getCode() === 1062) {
                        $message = "В документе присутствуют дубликаты спецификаций!";
                        self::query("
                            INSERT INTO `log` (`message`)
                            VALUES ('Попытка записать в документ дубликаты спецификаций');
                        ");
                        self::transaction('commit');
                    }
                    throw new Exception($message, $e->getCode());
                }
            }

        //  обновление итоговой суммы документа
            if ($sql['id'] || !empty($sql['detail'])) {
                self::query("
                    UPDATE `master` 
                    SET `total` = IFNULL((SELECT SUM(`price`) FROM `detail` WHERE `id_master` = '{$id_master}'), '0')
                    WHERE `id` = '{$id_master}';
                ;");
            }

        //  завершение транзакции
            self::transaction('commit');

        //  --->
            if (empty($query['list'])) {
                return true;
            } else {
                return self::list(['pagination' => $query['pagination'] ?? []]);
            }
    }


    //  удаление документа
    public static function delete($query)
    {
        //  проверка входящего параметра
            if (empty($query['id'])) {
                throw new Exception(self::$errors['param'] . ': Некорректно указан обязательный параметр (id)', 1);
            }

        //  обработка параметров
            $query['id'] = (int) $query['id'];

        //  выполнение запроса
            self::query("
                DELETE FROM `master` WHERE `id` = {$query['id']};
            ");

        //  --->
            if (empty($query['list'])) {
                return true;
            } else {
                return self::list(['pagination' => $query['pagination'] ?? []]);
            }
    }
}