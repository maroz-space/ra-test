<?php

//  подключение подключение конфигурации и классов
    include_once 'conf.php';
    include_once 'class' . DS . 'Documents.php';

//  генерация данных
    $number_1 = ['A-', 'Б-', 'Г-'];
    $number_2 = ['.001', '.011', '.109'];
    $year = ['2020', '2021', '2022', '2023', '2024'];
    
    foreach ($year as $y) {
        set_time_limit(60);
        $start = 1;
        for ($m = 1; $m <=12; $m++) {
            for ($d = 1; $d <=31; $d++) {
                if (checkdate($m, $d, $y)) {
                    for ($a = 1; $a <=10; $a++) {
                        $data = [
                            'doc' => [
                                'number' => $number_1[random_int(0, 2)] . $y . $number_2[random_int(0, 2)] . '/' . str_pad($start++, 10, '0', STR_PAD_LEFT),
                                'date' => $y . '-' . $m . '-' . $d,
                                'comment' => (random_int(0, 3) == 0) ? 'Случайный набор чисел ' . random_int(100000000, 1000000000000000) : ''
                            ]
                        ];
                        for ($i = 0; $i <= 20; $i++) {
                            if (random_int(0, 4) !== 0) continue;
                            $data['doc']['detail'][] = [
                                'name' => 'Спецификация ' . str_pad(random_int(1, 10), 10, '0', STR_PAD_LEFT) . ' (' . $y . ')',
                                'price' => random_int(0, 10000) . '.' . random_int(0, 99)
                            ];
                        }
                        try {
                            Documents::save($data);
                        } catch(Throwable $e) {
                            ###
                        }
                    }
                }
            }
        }
    }