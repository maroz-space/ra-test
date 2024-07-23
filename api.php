<?php

//  подключение конфигурации и классов
    include_once 'conf.php';
    include_once 'class' . DS . 'Documents.php';
    
//  структура ответа
    $result = ['status' => 0, 'status_msg' => '', 'data' => []];

//  обработка входящих параметров
    $data = json_decode($_REQUEST['data'] ?? '[]', JSON_OBJECT_AS_ARRAY);

//  выполнение запроса
    try {
        if (is_callable(['Documents', $_REQUEST['action'] ?? ''])) {
            $result['data'] = Documents::{$_REQUEST['action']}($data);
        } else {
            $result['status'] = '1';
            $result['status_msg'] = 'Ошибка параметров запроса API: Метод указан некорректно';
        }
    } catch(Throwable $e) {
        $result['status'] = '1';
        $result['status_msg'] = $e->getMessage() ?: 'Неизвестная ошибка';
    }

//  возврат ответа
    echo json_encode($result, JSON_UNESCAPED_UNICODE);