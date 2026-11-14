<?php

namespace App\Domain\Catalog\Enums;

enum ProductLine: string
{
    case Homme = 'homme';
    case Femme = 'femme';
    case Coffret = 'coffret';
}
