import React, { useEffect, useState } from 'react';
import { Shield, User, X } from 'lucide-react';
import { Player, Position, StarRating } from '../types/society';
import { hasDuplicateIdentity } from '../utils/drawAlgorithm';
import { StarRatingPicker } from './StarRating';

interface PlayerFormModalProps {
  open: boolean;
  editingPlayer: Player | null;
  existingPlayers: Player[];
  onSave: (data: {
    id?: string;
    name: string;
    complement: string;
    position: Position;
    rating: StarRating;
  }) => void;
  onClose: () => void;
}

export function PlayerFormModal({
  open,
  editingPlayer,
  existingPlayers,
  onSave,
  onClose,
}: PlayerFormModalProps) {
  const [name, setName] = useState('');
  const [complement, setComplement] = useState('');
  const [position, setPosition] = useState<Position>('outfield');
  const [rating, setRating] = useState<StarRating>(3);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (editingPlayer) {
      setName(editingPlayer.name);
      setComplement(editingPlayer.complement);
      setPosition(editingPlayer.position);
      setRating(editingPlayer.rating);
    } else {
      setName('');
      setComplement('');
      setPosition('outfield');
      setRating(3);
    }
    setError(null);
  }, [open, editingPlayer]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const trimmedName = name.trim();
  const trimmedComplement = complement.trim();

  const isDuplicate =
    trimmedName.length > 0 &&
    hasDuplicateIdentity(
      existingPlayers,
      trimmedName,
      trimmedComplement,
      editingPlayer?.id
    );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trimmedName) {
      setError('Informe o nome do jogador.');
      return;
    }
    if (isDuplicate) {
      setError(
        'Já existe um jogador com esse mesmo nome e identificação complementar. Altere o nome ou informe uma identificação complementar diferente.'
      );
      return;
    }

    onSave({
      id: editingPlayer?.id,
      name: trimmedName,
      complement: trimmedComplement,
      position,
      rating,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="player-modal-title"
    >
      <div className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-[#121B15] border border-white/15 rounded-t-2xl sm:rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 id="player-modal-title" className="text-xl font-bold text-white">
            {editingPlayer ? 'Editar Jogador' : 'Cadastrar Jogador'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar formulário"
            className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center rounded-lg text-[#92A398] hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Nome */}
          <div className="space-y-1.5">
            <label htmlFor="player-name" className="block text-sm font-medium text-[#D5E0D8]">
              Nome do jogador <span className="text-emerald-400">*</span>
            </label>
            <input
              id="player-name"
              type="text"
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Ex: Gabriel"
              maxLength={48}
              className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl bg-[#0B120E] border border-white/15 text-white placeholder-[#5F7266] text-base focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Identificação complementar */}
          <div className="space-y-1.5">
            <label
              htmlFor="player-complement"
              className="block text-sm font-medium text-[#D5E0D8]"
            >
              Identificação complementar <span className="text-[#7E9285] font-normal">(opcional)</span>
            </label>
            <input
              id="player-complement"
              type="text"
              value={complement}
              onChange={(e) => {
                setComplement(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Ex: Silva, Goleiro, Canhoto, Turma A..."
              maxLength={40}
              className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl bg-[#0B120E] border border-white/15 text-white placeholder-[#5F7266] text-base focus:outline-none focus:border-emerald-500 transition-colors"
            />
            <p className="text-xs text-[#889B8F]">
              Usado para diferenciar jogadores com nomes iguais (ex: Gabriel · Goleiro e Gabriel · Linha).
            </p>
          </div>

          {/* Posição */}
          <div className="space-y-2">
            <span className="block text-sm font-medium text-[#D5E0D8]">Posição</span>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setPosition('outfield')}
                className={`min-h-[48px] px-4 py-2.5 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${
                  position === 'outfield'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                    : 'bg-[#0B120E] border-white/10 text-[#9FB0A5] hover:border-white/25 hover:text-white'
                }`}
              >
                <User className="w-4 h-4 shrink-0" />
                <span>Jogador de linha</span>
              </button>
              <button
                type="button"
                onClick={() => setPosition('goalkeeper')}
                className={`min-h-[48px] px-4 py-2.5 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${
                  position === 'goalkeeper'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                    : 'bg-[#0B120E] border-white/10 text-[#9FB0A5] hover:border-white/25 hover:text-white'
                }`}
              >
                <Shield className="w-4 h-4 shrink-0" />
                <span>Goleiro</span>
              </button>
            </div>
          </div>

          {/* Avaliação por estrelas separada por posição */}
          <div className="pt-1 border-t border-white/10">
            <StarRatingPicker
              value={rating}
              onChange={setRating}
              label={
                position === 'goalkeeper'
                  ? 'Avaliação técnica como Goleiro'
                  : 'Avaliação técnica como Jogador de Linha'
              }
            />
          </div>

          {(error || isDuplicate) && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-300 leading-relaxed"
            >
              {error ||
                'Já existe um cadastro com esse mesmo nome e identificação complementar. Informe uma identificação complementar diferente para prosseguir.'}
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[46px] px-4 py-2.5 rounded-xl border border-white/15 text-sm font-semibold text-[#D3DED7] hover:bg-white/5 transition-colors whitespace-nowrap"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isDuplicate}
              className="min-h-[46px] px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-45 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors whitespace-nowrap"
            >
              {editingPlayer ? 'Salvar alterações' : 'Cadastrar jogador'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
