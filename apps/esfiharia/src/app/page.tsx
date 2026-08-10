"use client";

import Link from "next/link";
import {
  Clock3,
  MapPin,
  PackageCheck,
  ShoppingBag,
  Sparkles,
  Truck,
} from "lucide-react";
import { useStore } from "@/components/store-provider";

export default function LandingPage() {
  const { snapshot, loading, error } = useStore();
  const inactive = snapshot && !snapshot.store.active;
  const settings = snapshot?.settings;

  return (
    <main>
      <section className="hero container">
        <div className="hero-copy">
          <span className="eyebrow">Sabor que acolhe</span>
          <h1>Esfihas feitas para chegar quentinhas.</h1>
          <p>
            {settings?.subtitle ||
              "A Esfiharia da Manu está preparando uma experiência simples, cuidadosa e cheia de sabor."}
          </p>
          {loading && (
            <p className="notice" role="status">
              Carregando informações da loja...
            </p>
          )}
          {error && (
            <p className="notice" role="alert">
              {error}
            </p>
          )}
          {inactive && (
            <p className="notice">
              <strong>Estamos em pré-lançamento.</strong>
              <br />A loja ainda não está disponível para pedidos.
            </p>
          )}
          <div className="actions">
            <Link className="btn" href="/delivery">
              <ShoppingBag size={19} />
              Ver cardápio
            </Link>
            {settings?.whatsapp && (
              <a
                className="btn secondary"
                href={`https://wa.me/${settings.whatsapp.replace(/\D/g, "")}`}
              >
                Falar com a loja
              </a>
            )}
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="container">
          <div className="section-title">
            <span className="eyebrow">Uma nova operação</span>
            <h2>Simples para pedir. Cuidadosa em cada detalhe.</h2>
          </div>
          <div className="feature-grid">
            <article className="feature-card">
              <Sparkles />
              <h3>Preparo cuidadoso</h3>
              <p className="muted">
                Um cardápio direto, com informações claras e sem combinações
                confusas.
              </p>
            </article>
            <article className="feature-card">
              <PackageCheck />
              <h3>Retirada prática</h3>
              <p className="muted">
                Faça o pedido e acompanhe cada etapa até ficar pronto.
              </p>
            </article>
            <article className="feature-card">
              <Truck />
              <h3>Entrega transparente</h3>
              <p className="muted">
                Taxa, pedido mínimo e disponibilidade calculados pela própria
                loja.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-title">
            <span className="eyebrow">Destaques</span>
            <h2>O cardápio da Esfiharia</h2>
            <p>
              {snapshot?.products.length
                ? "Conheça os produtos em destaque."
                : "Cardápio ainda não cadastrado."}
            </p>
          </div>
          {snapshot?.products.length ? (
            <div className="product-grid">
              {snapshot.products
                .filter((product) => product.featured)
                .slice(0, 3)
                .map((product) => (
                  <article className="product-card" key={product.id}>
                    <h3>{product.name}</h3>
                    <p className="muted">{product.description}</p>
                    <Link className="btn" href="/delivery">
                      Ver no cardápio
                    </Link>
                  </article>
                ))}
            </div>
          ) : (
            <div className="empty">
              <ShoppingBag size={32} />
              <h3>Novidades em breve</h3>
              <p className="muted">
                Os produtos serão publicados quando a operação estiver pronta.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="section alt">
        <div className="container">
          <div className="feature-grid">
            <article className="feature-card">
              <Clock3 />
              <h3>Horário</h3>
              <p className="muted">
                {settings?.displayedHours || "Horários ainda não configurados."}
              </p>
            </article>
            <article className="feature-card">
              <MapPin />
              <h3>Endereço</h3>
              <p className="muted">
                {settings?.address || "Endereço ainda não informado."}
              </p>
            </article>
            <article className="feature-card">
              <ShoppingBag />
              <h3>Pedidos</h3>
              <p className="muted">
                {snapshot?.store.active && settings?.deliveryOpen
                  ? "Pedidos disponíveis pelo cardápio."
                  : "A loja ainda não está disponível para pedidos."}
              </p>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}
