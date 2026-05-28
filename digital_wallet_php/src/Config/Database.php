<?php

namespace App\Config;

use PDO;

class Database
{
    private static ?PDO $instance = null;

    public static function getConnection(): PDO
    {
        if (self::$instance === null) {
            $host = getenv('DB_HOST') ?: 'localhost';
            $port = getenv('DB_PORT') ?: '5436';
            $dbname = getenv('DB_DATABASE') ?: 'digital_wallet';
            $user = getenv('DB_USERNAME') ?: 'postgres';
            $password = getenv('DB_PASSWORD') ?: 'root';

            $dsn = "pgsql:host={$host};port={$port};dbname={$dbname}";

            self::$instance = new PDO($dsn, $user, $password, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
        }

        return self::$instance;
    }

    public static function reset(): void
    {
        self::$instance = null;
    }
}
