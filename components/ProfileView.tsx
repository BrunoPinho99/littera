import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { getClassesBySchool } from '../services/databaseService';
import { ClassGroup } from '../types';

interface ProfileViewProps {
  user: any;
}

const ProfileView: React.FC<ProfileViewProps> = ({ user }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || "");
  const [phone, setPhone] = useState(user?.user_metadata?.phone || "");
  const [email, setEmail] = useState(user?.email || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [photoUrl, setPhotoUrl] = useState(user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${user?.email}&background=8B5CF6&color=fff`);
  const [schoolName, setSchoolName] = useState(user?.user_metadata?.school || "Não vinculada");
  
  const userType = user?.user_metadata?.user_type;
  const isInstitution = userType === 'institution' || userType === 'school_admin';
  const isProfessor = userType === 'professor' || userType === 'teacher';
  const schoolId = user?.user_metadata?.school_id || null;
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  
  // Credit Card States
  const [isUpdatingCard, setIsUpdatingCard] = useState(false);
  const [cardHolderName, setCardHolderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiryMonth, setCardExpiryMonth] = useState("");
  const [cardExpiryYear, setCardExpiryYear] = useState("");
  const [cardCcv, setCardCcv] = useState("");
  const [cardCpfCnpj, setCardCpfCnpj] = useState("");
  const [cardPostalCode, setCardPostalCode] = useState("");
  const [cardAddressNumber, setCardAddressNumber] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (schoolId && (isInstitution || isProfessor)) {
      loadClasses();
    }
  }, [schoolId]);

  const loadClasses = async () => {
    if (schoolId) {
      const data = await getClassesBySchool(schoolId);
      setClasses(data);
    }
  };


  const handleEdit = () => setIsEditing(true);
  
  const handleCancel = () => {
    setFullName(user?.user_metadata?.full_name || "");
    setPhone(user?.user_metadata?.phone || "");
    setEmail(user?.email || "");
    setNewPassword("");
    setConfirmPassword("");
    setPhotoUrl(user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${user?.email}&background=8B5CF6&color=fff`);
    setSchoolName(user?.user_metadata?.school || "Não vinculada");
    setIsEditing(false);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { alert("A imagem deve ter no máximo 2MB."); return; }
      const reader = new FileReader();
      reader.onloadend = () => setPhotoUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    if (newPassword && newPassword !== confirmPassword) {
      alert("As senhas não coincidem.");
      return;
    }
    
    setIsSaving(true);
    try {
      const updates: any = {
        data: { full_name: fullName, phone: phone, school: schoolName, avatar_url: photoUrl }
      };
      
      if (email !== user?.email) {
        updates.email = email;
      }
      
      if (newPassword) {
        updates.password = newPassword;
      }
      
      const { error } = await supabase.auth.updateUser(updates);
      if (error) throw error;
      
      alert("Perfil atualizado com sucesso!" + (email !== user?.email ? " Verifique seu novo e-mail para confirmar a alteração." : ""));
      setIsEditing(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      const msg = error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
      alert("Erro ao salvar perfil: " + msg);
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleUpdateCreditCard = async () => {
    if (!cardHolderName || !cardNumber || !cardExpiryMonth || !cardExpiryYear || !cardCcv || !cardCpfCnpj) {
      alert("Preencha todos os campos do cartão.");
      return;
    }
    
    setIsUpdatingCard(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-credit-card', {
        body: {
          schoolId,
          creditCardData: {
            holderName: cardHolderName,
            number: cardNumber,
            expiryMonth: cardExpiryMonth,
            expiryYear: cardExpiryYear,
            ccv: cardCcv,
            cpfCnpj: cardCpfCnpj,
            postalCode: cardPostalCode,
            addressNumber: cardAddressNumber,
            phone: phone
          }
        }
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      alert("Cartão atualizado com sucesso no Asaas!");
      setCardNumber("");
      setCardCcv("");
    } catch (err: any) {
      alert(`Erro ao atualizar cartão: ${err.message}`);
    } finally {
      setIsUpdatingCard(false);
    }
  };

  const getUserLabel = () => {
    if (isInstitution) return "Administrador Escolar";
    if (isProfessor) return "Professor(a)";
    return "Estudante";
  };

  return (
    <div className="animate-fade-in max-w-5xl mx-auto pb-20 px-4">
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-on-surface tracking-tighter">Meu Perfil</h1>
          <p className="text-on-surface-variant dark:text-on-surface-variant mt-1 font-medium">Configurações da sua conta {getUserLabel().toLowerCase()}.</p>
        </div>
        {!isEditing ? (
          <div className="flex gap-3">
              <button 
                onClick={handleEdit}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/30 hover:bg-primary-dark transition-all active:scale-95"
              >
                <span className="material-icons-outlined text-[20px]">edit</span> Editar Perfil
              </button>
          </div>
        ) : (
          <div className="flex gap-3">
            <button onClick={handleCancel} className="px-6 py-2.5 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-on-surface-variant rounded-xl font-bold transition-colors">Cancelar</button>
            <button 
              disabled={isSaving}
              onClick={handleSaveProfile}
              className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold shadow-lg flex items-center gap-2 transition-all hover:bg-primary-dark disabled:opacity-50"
            >
              {isSaving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "Salvar Alterações"}
            </button>
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-8">
          <div className="bg-surface-container-lowest rounded-card p-8 border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col items-center text-center">
            <div className="relative mb-6">
              <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-primary to-blue-400 shadow-xl relative group">
                <img src={photoUrl} alt="Profile" className="w-full h-full rounded-full object-cover border-4 border-white dark:border-surface-dark" />
                {isEditing && (
                  <button onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="material-icons-outlined">photo_camera</span>
                  </button>
                )}
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            </div>
            <h2 className="text-xl font-black text-on-surface truncate w-full">{fullName || "Sem Nome"}</h2>
            <p className="text-on-surface-variant text-sm font-bold truncate w-full mb-6">{user?.email}</p>
            <div className="w-full pt-6 border-t border-gray-50 dark:border-slate-800">
               <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest block mb-2">Função Ativa</span>
               <span className="px-4 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-widest">
                  {getUserLabel()}
               </span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-8">
          <div className="bg-surface-container-lowest rounded-card p-8 border border-gray-100 dark:border-slate-800 shadow-sm">
            <h3 className="text-lg font-black text-on-surface mb-6 flex items-center gap-2">
              <span className="material-icons-outlined text-primary">badge</span>
              Informações Pessoais
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest ml-1">Nome Completo</label>
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={!isEditing} className="w-full px-5 py-4 rounded-2xl bg-surface-container-low border-none outline-none font-bold text-sm focus:ring-2 focus:ring-primary/10 transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest ml-1">Telefone / WhatsApp</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!isEditing} placeholder="(00) 00000-0000" className="w-full px-5 py-4 rounded-2xl bg-surface-container-low border-none outline-none font-bold text-sm focus:ring-2 focus:ring-primary/10 transition-all" />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest ml-1">Instituição Vinculada</label>
                <div className={`flex items-center gap-3 px-5 py-4 rounded-2xl bg-surface-container-low font-bold text-sm text-on-surface ${isEditing && isInstitution ? 'ring-2 ring-primary/20' : ''}`}>
                  <span className="material-icons-outlined text-primary text-xl">domain</span>
                  {isEditing && isInstitution ? (
                    <input type="text" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} className="bg-transparent border-none outline-none w-full p-0 font-bold" />
                  ) : (
                    <span>{schoolName}</span>
                  )}
                </div>
                {(isProfessor || !isInstitution) && <p className="text-[9px] text-on-surface-variant mt-1 italic">* O vínculo institucional é gerido pela conta mestre da escola.</p>}
              </div>
            </div>
          </div>
          
          {/* Segurança */}
          <div className="bg-surface-container-lowest rounded-card p-8 border border-gray-100 dark:border-slate-800 shadow-sm">
            <h3 className="text-lg font-black text-on-surface mb-6 flex items-center gap-2">
              <span className="material-icons-outlined text-primary">security</span>
              Segurança e Acesso
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest ml-1">E-mail</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!isEditing} className="w-full px-5 py-4 rounded-2xl bg-surface-container-low border-none outline-none font-bold text-sm focus:ring-2 focus:ring-primary/10 transition-all" />
                {isEditing && <p className="text-[10px] text-on-surface-variant mt-1 ml-1">* Você precisará confirmar o novo e-mail através de um link enviado para ele.</p>}
              </div>
              {isEditing && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest ml-1">Nova Senha</label>
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Deixe em branco para não alterar" className="w-full px-5 py-4 rounded-2xl bg-surface-container-low border-none outline-none font-bold text-sm focus:ring-2 focus:ring-primary/10 transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest ml-1">Confirmar Nova Senha</label>
                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repita a nova senha" className="w-full px-5 py-4 rounded-2xl bg-surface-container-low border-none outline-none font-bold text-sm focus:ring-2 focus:ring-primary/10 transition-all" />
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Pagamento (Somente Instituição) */}
          {isInstitution && (
            <div className="bg-surface-container-lowest rounded-card p-8 border border-gray-100 dark:border-slate-800 shadow-sm">
              <h3 className="text-lg font-black text-on-surface mb-6 flex items-center gap-2">
                <span className="material-icons-outlined text-primary">credit_card</span>
                Cartão de Crédito
              </h3>
              <p className="text-sm text-on-surface-variant mb-6">Atualize o cartão de crédito utilizado para a assinatura da escola. O cartão será validado imediatamente.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest ml-1">Nome no Cartão</label>
                  <input type="text" value={cardHolderName} onChange={(e) => setCardHolderName(e.target.value)} placeholder="Como impresso no cartão" className="w-full px-5 py-3 rounded-xl bg-surface-container-low border-none outline-none font-bold text-sm focus:ring-2 focus:ring-primary/10 transition-all" />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest ml-1">Número do Cartão</label>
                  <input type="text" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} placeholder="0000 0000 0000 0000" className="w-full px-5 py-3 rounded-xl bg-surface-container-low border-none outline-none font-bold text-sm focus:ring-2 focus:ring-primary/10 transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest ml-1">Mês de Expiração (MM)</label>
                  <input type="text" value={cardExpiryMonth} onChange={(e) => setCardExpiryMonth(e.target.value)} placeholder="MM" maxLength={2} className="w-full px-5 py-3 rounded-xl bg-surface-container-low border-none outline-none font-bold text-sm focus:ring-2 focus:ring-primary/10 transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest ml-1">Ano de Expiração (AAAA)</label>
                  <input type="text" value={cardExpiryYear} onChange={(e) => setCardExpiryYear(e.target.value)} placeholder="AAAA" maxLength={4} className="w-full px-5 py-3 rounded-xl bg-surface-container-low border-none outline-none font-bold text-sm focus:ring-2 focus:ring-primary/10 transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest ml-1">CVC</label>
                  <input type="text" value={cardCcv} onChange={(e) => setCardCcv(e.target.value)} placeholder="123" maxLength={4} className="w-full px-5 py-3 rounded-xl bg-surface-container-low border-none outline-none font-bold text-sm focus:ring-2 focus:ring-primary/10 transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest ml-1">CPF/CNPJ do Titular</label>
                  <input type="text" value={cardCpfCnpj} onChange={(e) => setCardCpfCnpj(e.target.value)} placeholder="Apenas números" className="w-full px-5 py-3 rounded-xl bg-surface-container-low border-none outline-none font-bold text-sm focus:ring-2 focus:ring-primary/10 transition-all" />
                </div>
                
                <div className="mt-4 md:col-span-2">
                  <button 
                    onClick={handleUpdateCreditCard}
                    disabled={isUpdatingCard}
                    className="px-6 py-3 bg-primary text-white rounded-xl font-bold w-full md:w-auto flex items-center justify-center gap-2 hover:bg-primary-dark transition-colors disabled:opacity-50"
                  >
                    {isUpdatingCard ? (
                       <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                       <><span className="material-icons-outlined">credit_score</span> Salvar Novo Cartão no Asaas</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {(isInstitution || isProfessor) && (
            <div className="bg-surface-container-lowest rounded-card p-8 border border-gray-100 dark:border-slate-800 shadow-sm">
              <h3 className="text-lg font-black text-on-surface mb-6 flex items-center gap-2">
                 <span className="material-icons-outlined text-primary">groups</span>
                 Minhas Turmas Ativas
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {classes.map(cls => (
                  <div key={cls.id} className="p-4 border border-gray-50 dark:border-slate-800 rounded-2xl bg-surface-container-low dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-800 transition-all">
                     <p className="font-bold text-sm text-on-surface">{cls.name}</p>
                     <p className="text-[10px] text-on-surface-variant font-black uppercase tracking-widest">{cls.grade}</p>
                  </div>
                ))}
                {classes.length === 0 && (
                  <div className="col-span-full py-8 text-center text-on-surface-variant font-bold italic bg-surface-container-low/30 rounded-2xl">
                    Nenhuma turma registrada neste vínculo ainda.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileView;
