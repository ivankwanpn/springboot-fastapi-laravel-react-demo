<?php

namespace App\Util;

class Timestamp
{
    public static function format(?string $ts): ?string
    {
        if ($ts === null) {
            return null;
        }
        $dt = \DateTimeImmutable::createFromFormat('Y-m-d H:i:s.u', $ts, new \DateTimeZone('UTC'));
        if ($dt === false) {
            $dt = \DateTimeImmutable::createFromFormat('Y-m-d H:i:s', $ts, new \DateTimeZone('UTC'));
        }
        return $dt ? $dt->format('Y-m-d\TH:i:s.u\Z') : null;
    }
}
