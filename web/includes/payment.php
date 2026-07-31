<?php
/**
 * Marsa — abstraction des moyens de paiement.
 * Une interface commune permet d'ajouter un opérateur sans toucher au reste
 * du code. Les intégrations réelles (Bankily, Masrvi, Sedad, Wave, Orange
 * Money, carte, virement) se branchent en implémentant PaymentProvider.
 *
 * ⚠️ Ici, l'implémentation par défaut SIMULE la validation (aucun opérateur
 * réel n'est branché dans cet environnement). Le flux applicatif — montant
 * exact, enregistrement de la transaction, déverrouillage — est complet.
 */

interface PaymentProvider
{
    public function key(): string;
    public function label(): string;
    /** @return array{ok:bool, reference:string, message?:string} */
    public function charge(array $user, int $amount, string $currency, array $data): array;
}

abstract class BaseProvider implements PaymentProvider
{
    protected string $key;
    protected string $label;
    public function key(): string { return $this->key; }
    public function label(): string { return $this->label; }
    protected function ref(string $prefix): string
    {
        return strtoupper($prefix) . '-' . date('ymd') . '-' . strtoupper(bin2hex(random_bytes(3)));
    }
}

/** Portefeuilles mobiles (Bankily, Masrvi, Sedad, Wave, Orange Money…). */
class MobileMoneyProvider extends BaseProvider
{
    public function __construct(string $key, string $label) { $this->key = $key; $this->label = $label; }
    public function charge(array $user, int $amount, string $currency, array $data): array
    {
        // Intégration opérateur à brancher ici (API/USSD). Simulation :
        return ['ok' => true, 'reference' => $this->ref($this->key)];
    }
}

class CardProvider extends BaseProvider
{
    public function __construct() { $this->key = 'carte'; $this->label = 'Carte bancaire'; }
    public function charge(array $user, int $amount, string $currency, array $data): array
    {
        return ['ok' => true, 'reference' => $this->ref('CARD')];
    }
}

class TransferProvider extends BaseProvider
{
    public function __construct() { $this->key = 'virement'; $this->label = 'Virement bancaire'; }
    public function charge(array $user, int $amount, string $currency, array $data): array
    {
        return ['ok' => true, 'reference' => $this->ref('VIR')];
    }
}

/** Registre des moyens disponibles selon le pays. */
function payment_providers(string $pays): array
{
    $mm = $pays === 'SN'
        ? [['wave', 'Wave'], ['orange_money', 'Orange Money']]
        : [['bankily', 'Bankily'], ['masrvi', 'Masrvi'], ['sedad', 'Sedad'], ['click', 'Click']];
    $list = [];
    foreach ($mm as [$k, $l]) { $list[$k] = new MobileMoneyProvider($k, $l); }
    $list['carte'] = new CardProvider();
    $list['virement'] = new TransferProvider();
    return $list;
}

function payment_provider(string $pays, string $method): ?PaymentProvider
{
    return payment_providers($pays)[$method] ?? null;
}
