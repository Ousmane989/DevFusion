<?php
/** Marsa — déconnexion. */
require __DIR__ . '/includes/app.php';
logout_user();
redirect('index.php');
