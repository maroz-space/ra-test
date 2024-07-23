<?php

//  обработка ошибок
    ini_set('display_errors', 1);
    ini_set('display_startup_errors', 1);
    error_reporting(E_ALL);

//  сепаратор
    define('DS', DIRECTORY_SEPARATOR);

//  параметры подключения к БД
    define('DB_HOST', 'localhost');
    define('DB_PORT', '3309');
    define('DB_BASE', '019_ra');
    define('DB_USER', 'root');
    define('DB_PASS', '');