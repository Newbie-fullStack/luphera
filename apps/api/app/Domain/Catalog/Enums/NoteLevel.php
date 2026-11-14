<?php

namespace App\Domain\Catalog\Enums;

enum NoteLevel: string
{
    case Top = 'top';
    case Heart = 'heart';
    case Base = 'base';
}
