-- phpMyAdmin SQL Dump
-- version 5.0.2
-- https://www.phpmyadmin.net/
--
-- Хост: 127.0.0.1:3309
-- Время создания: Июл 23 2024 г., 02:54
-- Версия сервера: 10.3.22-MariaDB
-- Версия PHP: 7.4.5

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- База данных: `019_ra`
--

-- --------------------------------------------------------

--
-- Структура таблицы `detail`
--

CREATE TABLE `detail` (
  `name` text NOT NULL,
  `price` float NOT NULL,
  `name_hash` varchar(32) NOT NULL,
  `id_master` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Структура таблицы `log`
--

CREATE TABLE `log` (
  `id` int(11) NOT NULL,
  `message` text NOT NULL,
  `datetime` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --------------------------------------------------------

--
-- Структура таблицы `master`
--

CREATE TABLE `master` (
  `id` int(11) NOT NULL,
  `number` varchar(32) NOT NULL,
  `date` date NOT NULL,
  `total` float NOT NULL DEFAULT 0,
  `comment` text NOT NULL DEFAULT '',
  `date_created` timestamp NOT NULL DEFAULT current_timestamp(),
  `date_modified` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Триггеры `master`
--
DELIMITER $$
CREATE TRIGGER `MASTER_AFTER_DELETE` AFTER DELETE ON `master` FOR EACH ROW DELETE FROM `detail` WHERE `id_master` = OLD.`id`
$$
DELIMITER ;

--
-- Индексы сохранённых таблиц
--

--
-- Индексы таблицы `detail`
--
ALTER TABLE `detail`
  ADD UNIQUE KEY `UNIQUE_DETAIL_NAME` (`name_hash`,`id_master`) USING BTREE;

--
-- Индексы таблицы `log`
--
ALTER TABLE `log`
  ADD PRIMARY KEY (`id`);

--
-- Индексы таблицы `master`
--
ALTER TABLE `master`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `UNIQUE_MASTER_NUMBER` (`number`) USING BTREE;

--
-- AUTO_INCREMENT для сохранённых таблиц
--

--
-- AUTO_INCREMENT для таблицы `log`
--
ALTER TABLE `log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT для таблицы `master`
--
ALTER TABLE `master`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
