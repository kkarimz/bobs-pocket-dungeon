import type { RunState } from "../game/engine";
import { SHOP_ITEMS } from "../game/rules";
import type { ShopItemId } from "../game/rules";
import { iconUrl } from "../game/icons";

interface Props {
  run: RunState;
  onBuy: (id: ShopItemId) => void;
  onClose: () => void;
}

export function MerchantModal({ run, onBuy, onClose }: Props) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <header>
          <img src={iconUrl("shop")} alt="" />
          <h2>DUNGEON MERCHANT</h2>
        </header>
        <p className="modal-sub">Each item once per run.</p>
        <ul className="shop-list">
          {SHOP_ITEMS.map((item) => {
            const owned = run.inventory[item.id];
            const used =
              (item.id === "healing-potion" && run.inventory.usedPotion) ||
              (item.id === "lucky-feather" && run.inventory.usedFeather) ||
              (item.id === "blackpowder-bomb" && run.inventory.usedBomb) ||
              (item.id === "skeleton-key" && run.inventory.usedKey);
            const canBuy = !owned && run.gold >= item.cost;
            return (
              <li key={item.id} className="shop-row">
                <img src={iconUrl(item.icon)} alt="" />
                <div className="shop-info">
                  <strong>{item.name}</strong>
                  <span>{item.effect}</span>
                </div>
                <div className="shop-cost">
                  <img src={iconUrl("coin")} alt="" />
                  {item.cost}
                </div>
                <div className="shop-action">
                  {owned ? (
                    <span className="owned">
                      {item.marker === "Owned"
                        ? "OWNED"
                        : used
                          ? "USED"
                          : "READY"}
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="btn small"
                      disabled={!canBuy}
                      onClick={() => onBuy(item.id)}
                    >
                      Buy
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <button type="button" className="btn primary" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}
