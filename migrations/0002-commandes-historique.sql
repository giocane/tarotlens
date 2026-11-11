-- Historique des modifications d'une commande faites depuis l'admin (JSON, 20 entrées max).
-- À appliquer sur la base D1 de production AVANT de déployer la fonction « Modifier la commande ».
ALTER TABLE commandes ADD COLUMN historique TEXT;
