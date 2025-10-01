import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Plus, AlertCircle, Settings, X, ChefHat, Edit2, Download, Upload, Copy, Moon, Sun, Link, Check, Minus, Clock } from 'lucide-react';

// ==================== Constants ====================
const DEFAULT_CATEGORIES = ['채소', '과일', '육류', '유제품', '기타'];
const DEFAULT_RECIPE_CATEGORIES = ['한식', '중식', '일식', '양식', '디저트', '기타'];
const EXPIRY_FILTERS = ['전체', '만료', '3일', '1주일', '1개월', '1개월+'];

const RECIPE_DB = [];

const CATEGORY_COLORS = ['bg-green-100 text-green-800', 'bg-red-100 text-red-800', 'bg-pink-100 text-pink-800',
  'bg-blue-100 text-blue-800', 'bg-purple-100 text-purple-800', 'bg-yellow-100 text-yellow-800',
  'bg-indigo-100 text-indigo-800', 'bg-orange-100 text-orange-800', 'bg-teal-100 text-teal-800', 'bg-gray-100 text-gray-800'];

const RECIPE_CATEGORY_COLORS = ['bg-rose-100 text-rose-800', 'bg-amber-100 text-amber-800', 'bg-lime-100 text-lime-800',
  'bg-cyan-100 text-cyan-800', 'bg-violet-100 text-violet-800', 'bg-fuchsia-100 text-fuchsia-800',
  'bg-emerald-100 text-emerald-800', 'bg-sky-100 text-sky-800'];

// ==================== Utility Functions ====================
const getDaysUntilExpiry = (date) => {
  try {
    const expiry = new Date(date);
    const today = new Date();
    if (isNaN(expiry.getTime())) return 999;
    const diff = expiry - today;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  } catch {
    return 999;
  }
};

const getExpiryStatus = (date) => {
  const days = getDaysUntilExpiry(date);
  if (days < 0) return { text: '유통기한 만료', color: 'text-red-600', bg: 'bg-red-50', darkBg: 'bg-red-950', darkTextColor: 'text-red-200' };
  if (days === 0) return { text: '오늘 만료', color: 'text-red-500', bg: 'bg-red-50', darkBg: 'bg-red-950', darkTextColor: 'text-red-200' };
  if (days <= 3) return { text: `${days}일 남음`, color: 'text-orange-600', bg: 'bg-orange-50', darkBg: 'bg-orange-950', darkTextColor: 'text-orange-200' };
  if (days <= 7) return { text: `${days}일 남음`, color: 'text-yellow-600', bg: 'bg-yellow-50', darkBg: 'bg-yellow-950', darkTextColor: 'text-yellow-200' };
  return { text: `${days}일 남음`, color: 'text-green-600', bg: 'bg-green-50', darkBg: 'bg-green-950', darkTextColor: 'text-green-200' };
};

const parseQuantity = (quantityStr) => {
  const match = quantityStr.match(/^([\d.]+)\s*(.*)$/);
  if (match) return { number: parseFloat(match[1]) || 0, unit: match[2].trim() };
  return { number: 0, unit: '' };
};

const formatQuantity = (number, unit) => {
  if (number === 0) return unit ? `0${unit}` : '0';
  return unit ? `${number}${unit}` : `${number}`;
};

const getCategoryColor = (cat, categories) => {
  const index = categories.indexOf(cat);
  return CATEGORY_COLORS[index >= 0 ? index % CATEGORY_COLORS.length : 0];
};

const getRecipeCategoryColor = (cat, recipeCategories) => {
  const index = recipeCategories.indexOf(cat);
  return RECIPE_CATEGORY_COLORS[index >= 0 ? index % RECIPE_CATEGORY_COLORS.length : 0];
};

// ==================== Custom Hooks ====================
const useLocalStorage = (key, initialValue) => {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error saving to localStorage: ${error}`);
    }
  }, [key, value]);

  return [value, setValue];
};

const useItems = (initialItems) => {
  const [items, setItems] = useLocalStorage('fridgeItems', initialItems);

  const addItem = (name, quantity, expiryDate, category) => {
    if (!name || !quantity || !expiryDate) return false;
    const testDate = new Date(expiryDate);
    if (isNaN(testDate.getTime())) return false;
    
    setItems([...items, { 
      id: Date.now(), 
      name: name.trim(), 
      quantity: quantity.trim(), 
      expiryDate, 
      category, 
      addedDate: new Date().toISOString().split('T')[0] 
    }]);
    return true;
  };

  const deleteItem = (id) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItemQuantity = (id, newQuantity) => {
    setItems(items.map(item => item.id === id ? { ...item, quantity: newQuantity } : item));
  };

  return { items, addItem, deleteItem, updateItemQuantity };
};

const useRecipes = (initialRecipes) => {
  const [recipes, setRecipes] = useLocalStorage('customRecipes', initialRecipes);

  const addRecipe = (recipe) => {
    setRecipes([...recipes, { ...recipe, id: Date.now(), isCustom: true }]);
  };

  const updateRecipe = (id, updatedRecipe) => {
    setRecipes(recipes.map(r => r.id === id ? { ...r, ...updatedRecipe } : r));
  };

  const deleteRecipe = (id) => {
    setRecipes(recipes.filter(r => r.id !== id));
  };

  const importRecipes = (importedRecipes) => {
    const validRecipes = importedRecipes.filter(r => 
      r.name && r.description && r.cookingTime && Array.isArray(r.ingredients)
    );
    if (validRecipes.length === 0) return 0;
    
    setRecipes([...recipes, ...validRecipes.map(r => ({
      ...r, 
      id: Date.now() + Math.random(), 
      isCustom: true
    }))]);
    return validRecipes.length;
  };

  return { recipes, addRecipe, updateRecipe, deleteRecipe, importRecipes };
};

// ==================== UI Components ====================
function QuantityControl({ item, darkMode, onIncrement, onDecrement, onEdit }) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onEdit(item)}
        className={`min-w-16 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-600 hover:border-blue-500 hover:ring-2 hover:ring-blue-500' : 'bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 hover:border-blue-500 hover:ring-2 hover:ring-blue-200'}`}
        title="클릭하여 직접 입력"
      >
        {item.quantity}
      </button>
      <button
        onClick={() => onDecrement(item)}
        className={`w-9 h-9 flex items-center justify-center rounded-lg font-bold transition-all ${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-600' : 'bg-gray-200 hover:bg-gray-300 text-gray-700 border border-gray-300'}`}
        title="수량 감소"
      >
        <Minus size={18} />
      </button>
      <button
        onClick={() => onIncrement(item)}
        className={`w-9 h-9 flex items-center justify-center rounded-lg font-bold transition-all ${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-600' : 'bg-gray-200 hover:bg-gray-300 text-gray-700 border border-gray-300'}`}
        title="수량 증가"
      >
        <Plus size={18} />
      </button>
    </div>
  );
}

function ItemCard({ item, darkMode, categories, onDelete, onQuantityChange, editingItemId, editingQuantity, setEditingQuantity, onSaveQuantity, onCancelEdit, editInputRef }) {
  const status = getExpiryStatus(item.expiryDate);
  const isDepleted = parseQuantity(item.quantity).number === 0;

  return (
    <div className={`${isDepleted ? (darkMode ? 'bg-gray-700 opacity-60' : 'bg-gray-100 opacity-75') : (darkMode ? status.darkBg : status.bg)} border ${darkMode ? 'border-gray-600' : 'border-gray-200'} rounded-lg p-4 transition-all hover:shadow-md`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-800'} ${isDepleted ? 'line-through' : ''}`}>{item.name}</h3>
            <span className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(item.category, categories)}`}>{item.category}</span>
            {isDepleted && <span className="text-xs px-2 py-1 rounded-full bg-gray-500 text-white font-semibold">소진됨</span>}
          </div>
          <div className={`space-y-1 text-sm ${darkMode ? 'text-gray-100' : 'text-gray-600'}`}>
            <div className="flex items-center gap-2">
              <span className={darkMode ? 'text-gray-100' : ''}>수량:</span>
              {editingItemId === item.id ? (
                <div className="flex items-center gap-2">
                  <input
                    ref={editInputRef}
                    type="text"
                    value={editingQuantity}
                    onChange={(e) => setEditingQuantity(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onSaveQuantity(item.id);
                      else if (e.key === 'Escape') onCancelEdit();
                    }}
                    className={`px-2 py-1 border rounded w-32 focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    placeholder="예: 2개, 500g"
                  />
                  <button onClick={() => onSaveQuantity(item.id)} className="p-1 bg-green-500 hover:bg-green-600 text-white rounded transition-colors" title="저장 (Enter)">
                    <Check size={16} />
                  </button>
                  <button onClick={onCancelEdit} className="p-1 bg-gray-500 hover:bg-gray-600 text-white rounded transition-colors" title="취소 (ESC)">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <QuantityControl
                  item={item}
                  darkMode={darkMode}
                  onIncrement={() => onQuantityChange(item, 1)}
                  onDecrement={() => onQuantityChange(item, -1)}
                  onEdit={(item) => onSaveQuantity(null, item)}
                />
              )}
            </div>
            <p className={darkMode ? 'text-gray-100' : ''}>유통기한: {item.expiryDate}</p>
            <p className={`font-semibold ${isDepleted ? (darkMode ? 'text-gray-400' : 'text-gray-500') : (darkMode ? status.darkTextColor : status.color)}`}>
              {isDepleted ? '재고 소진' : status.text}
            </p>
          </div>
        </div>
        <button onClick={() => onDelete(item.id)} className={`p-2 rounded-lg transition-colors ${darkMode ? 'text-red-400 hover:text-red-300 hover:bg-red-900' : 'text-red-600 hover:text-red-800 hover:bg-red-100'}`}>
          <Trash2 size={20} />
        </button>
      </div>
    </div>
  );
}

function CategoryManager({ darkMode, categories, onAddCategory, onDeleteCategory }) {
  const [newCategory, setNewCategory] = useState('');

  const handleAdd = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      onAddCategory(newCategory.trim());
      setNewCategory('');
    }
  };

  return (
    <div className="mb-6">
      <h3 className={`text-lg font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>카테고리 설정</h3>
      <div className="flex gap-2 mb-3">
        <input type="text" value={newCategory} onChange={(e) => setNewCategory(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
          className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${darkMode ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'}`}
          placeholder="새 카테고리 이름" />
        <button onClick={handleAdd} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">추가</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {categories.map(cat => (
          <div key={cat} className={`${getCategoryColor(cat, categories)} px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2`}>
            {cat}
            {categories.length > 1 && (
              <button onClick={() => onDeleteCategory(cat)} className="hover:bg-black hover:bg-opacity-10 rounded-full p-0.5">
                <X size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function RecipeForm({ darkMode, recipeCategories, editingRecipeId, recipeName, setRecipeName, recipeDescription, setRecipeDescription, recipeTime, setRecipeTime, recipeIngredients, setRecipeIngredients, recipeUrl, setRecipeUrl, recipeCategory, setRecipeCategory, onSubmit, onCancel }) {
  return (
    <div className={`mb-4 p-4 rounded-lg border space-y-3 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'}`}>
      <div className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{editingRecipeId ? '레시피 수정' : '새 레시피 추가'}</div>
      <input type="text" value={recipeName} onChange={(e) => setRecipeName(e.target.value)}
        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'}`} placeholder="요리 이름" />
      <input type="text" value={recipeDescription} onChange={(e) => setRecipeDescription(e.target.value)}
        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'}`} placeholder="요리 설명" />
      <div className="grid grid-cols-2 gap-3">
        <input type="text" value={recipeTime} onChange={(e) => setRecipeTime(e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'}`} placeholder="조리 시간 (예: 30분)" />
        <select value={recipeCategory} onChange={(e) => setRecipeCategory(e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}>
          {recipeCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
      </div>
      <input type="text" value={recipeIngredients} onChange={(e) => setRecipeIngredients(e.target.value)}
        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'}`} placeholder="필요한 재료 (쉼표로 구분)" />
      <input type="url" value={recipeUrl} onChange={(e) => setRecipeUrl(e.target.value)}
        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'}`} placeholder="레시피 링크 (선택사항)" />
      <button onClick={onSubmit} className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
        {editingRecipeId ? '수정 완료' : '레시피 저장'}
      </button>
    </div>
  );
}

function RecipeListItem({ recipe, darkMode, recipeCategories, copiedRecipeId, onCopyUrl, onEdit, onDelete }) {
  return (
    <div className={`flex items-start justify-between p-3 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{recipe.name}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${getRecipeCategoryColor(recipe.recipeCategory || '기타', recipeCategories)}`}>
            {recipe.recipeCategory || '기타'}
          </span>
          {recipe.url && recipe.url.length > 0 && (
            <button
              onClick={() => onCopyUrl(recipe.url, recipe.id)}
              className={`inline-flex items-center transition-colors ${
                copiedRecipeId === recipe.id 
                  ? 'text-green-600 hover:text-green-800' 
                  : 'text-blue-600 hover:text-blue-800'
              }`}
              title={copiedRecipeId === recipe.id ? '복사 완료!' : '레시피 링크 복사'}
            >
              {copiedRecipeId === recipe.id ? <Check size={16} /> : <Link size={16} />}
            </button>
          )}
        </div>
        <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>{recipe.description}</div>
        <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
          조리시간: {recipe.cookingTime} | 재료: {recipe.ingredients.join(', ')}
        </div>
      </div>
      <div className="flex gap-2 ml-3 flex-shrink-0">
        <button onClick={() => onEdit(recipe)} className={`p-2 rounded-lg transition-colors ${darkMode ? 'text-blue-400 hover:text-blue-300 hover:bg-blue-900' : 'text-blue-600 hover:text-blue-800 hover:bg-blue-100'}`}>
          <Edit2 size={18} />
        </button>
        <button onClick={() => onDelete(recipe.id)} className={`p-2 rounded-lg transition-colors ${darkMode ? 'text-red-400 hover:text-red-300 hover:bg-red-900' : 'text-red-600 hover:text-red-800 hover:bg-red-100'}`}>
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}

function ExportModal({ darkMode, exportData, onClose, onCopy }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className={`flex items-center justify-between p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>레시피 내보내기</h3>
          <button onClick={onClose} className={darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}>
            <X size={24} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          <p className={`text-sm mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>아래 JSON 데이터를 복사하세요.</p>
          <textarea readOnly value={exportData} className={`w-full h-64 p-3 border rounded-lg font-mono text-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-gray-50 border-gray-300 text-gray-900'}`} />
        </div>
        <div className={`flex gap-3 p-6 border-t ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
          <button onClick={onCopy} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">
            <Copy size={20} />클립보드에 복사
          </button>
        </div>
      </div>
    </div>
  );
}

function RecipeManager({ darkMode, recipeCategories, customRecipes, onAddRecipe, onUpdateRecipe, onDeleteRecipe, onImportRecipes, onExport }) {
  const [showRecipeForm, setShowRecipeForm] = useState(false);
  const [editingRecipeId, setEditingRecipeId] = useState(null);
  const [recipeName, setRecipeName] = useState('');
  const [recipeDescription, setRecipeDescription] = useState('');
  const [recipeTime, setRecipeTime] = useState('');
  const [recipeIngredients, setRecipeIngredients] = useState('');
  const [recipeUrl, setRecipeUrl] = useState('');
  const [recipeCategory, setRecipeCategory] = useState(recipeCategories[0] || '한식');
  const [recipeSearchQuery, setRecipeSearchQuery] = useState('');
  const [selectedRecipeFilter, setSelectedRecipeFilter] = useState('전체');
  const [copiedRecipeId, setCopiedRecipeId] = useState(null);
  const copyTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const handleSubmit = () => {
    if (!recipeName || !recipeDescription || !recipeTime || !recipeIngredients) {
      alert('모든 필수 항목을 입력해주세요.');
      return;
    }

    const ingredientsArray = recipeIngredients.split(',').map(i => i.trim()).filter(i => i);
    if (ingredientsArray.length === 0) {
      alert('재료를 하나 이상 입력해주세요.');
      return;
    }

    const recipeData = {
      name: recipeName.trim(),
      description: recipeDescription.trim(),
      cookingTime: recipeTime.trim(),
      ingredients: ingredientsArray,
      url: recipeUrl.trim(),
      recipeCategory: recipeCategory
    };

    if (editingRecipeId) {
      onUpdateRecipe(editingRecipeId, recipeData);
      alert('레시피가 수정되었습니다.');
    } else {
      onAddRecipe(recipeData);
      alert('레시피가 추가되었습니다.');
    }

    handleCancel();
  };

  const handleCancel = () => {
    setShowRecipeForm(false);
    setEditingRecipeId(null);
    setRecipeName('');
    setRecipeDescription('');
    setRecipeTime('');
    setRecipeIngredients('');
    setRecipeUrl('');
    setRecipeCategory(recipeCategories[0] || '한식');
  };

  const handleEdit = (recipe) => {
    setEditingRecipeId(recipe.id);
    setRecipeName(recipe.name);
    setRecipeDescription(recipe.description);
    setRecipeTime(recipe.cookingTime);
    setRecipeIngredients(recipe.ingredients.join(', '));
    setRecipeUrl(recipe.url || '');
    setRecipeCategory(recipe.recipeCategory || recipeCategories[0] || '한식');
    setShowRecipeForm(true);
  };

  const handleCopyUrl = (url, recipeId) => {
    if (!navigator.clipboard) {
      alert('이 브라우저는 클립보드 복사를 지원하지 않습니다.');
      return;
    }
    
    navigator.clipboard.writeText(url).then(() => {
      setCopiedRecipeId(recipeId);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => {
        setCopiedRecipeId(null);
        copyTimeoutRef.current = null;
      }, 1000);
    });
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target.result);
        if (Array.isArray(imported)) {
          const count = onImportRecipes(imported);
          if (count > 0) {
            alert(`${count}개의 레시피를 불러왔습니다!`);
          } else {
            alert('유효한 레시피가 없습니다.');
          }
        } else {
          alert('올바른 레시피 파일 형식이 아닙니다.');
        }
      } catch (error) {
        alert('파일을 읽는 중 오류가 발생했습니다.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const filteredRecipes = selectedRecipeFilter === '전체' ? customRecipes : 
    customRecipes.filter(r => r.recipeCategory === selectedRecipeFilter);

  const searchedRecipes = filteredRecipes.filter(r =>
    r.name.toLowerCase().includes(recipeSearchQuery.toLowerCase()) ||
    r.description.toLowerCase().includes(recipeSearchQuery.toLowerCase()));

  return (
    <div className="mt-6 pt-6 border-t border-gray-600">
      <div className="flex items-center justify-between mb-3">
        <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>나만의 레시피</h3>
        <div className="flex gap-2">
          {customRecipes.length > 0 && (
            <button onClick={onExport} className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors">
              <Download size={16} />내보내기
            </button>
          )}
          <label className="flex items-center gap-1 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors cursor-pointer">
            <Upload size={16} />불러오기
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
          <button onClick={() => showRecipeForm ? handleCancel() : setShowRecipeForm(true)}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors">
            {showRecipeForm ? '취소' : '+ 추가'}
          </button>
        </div>
      </div>

      {showRecipeForm && (
        <RecipeForm
          darkMode={darkMode}
          recipeCategories={recipeCategories}
          editingRecipeId={editingRecipeId}
          recipeName={recipeName}
          setRecipeName={setRecipeName}
          recipeDescription={recipeDescription}
          setRecipeDescription={setRecipeDescription}
          recipeTime={recipeTime}
          setRecipeTime={setRecipeTime}
          recipeIngredients={recipeIngredients}
          setRecipeIngredients={setRecipeIngredients}
          recipeUrl={recipeUrl}
          setRecipeUrl={setRecipeUrl}
          recipeCategory={recipeCategory}
          setRecipeCategory={setRecipeCategory}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      )}

      {customRecipes.length > 0 && (
        <div>
          <input type="text" value={recipeSearchQuery} onChange={(e) => setRecipeSearchQuery(e.target.value)} placeholder="레시피 검색..."
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent mb-3 ${darkMode ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'}`} />
          <div className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>카테고리 필터</div>
          <div className="flex flex-wrap gap-2 mb-3">
            <button onClick={() => setSelectedRecipeFilter('전체')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${selectedRecipeFilter === '전체' ? (darkMode ? 'bg-indigo-700 text-white' : 'bg-indigo-600 text-white') : (darkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')}`}>
              전체 ({customRecipes.length})
            </button>
            {recipeCategories.map(cat => {
              const count = customRecipes.filter(r => r.recipeCategory === cat).length;
              if (count === 0) return null;
              return (
                <button key={cat} onClick={() => setSelectedRecipeFilter(cat)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${selectedRecipeFilter === cat ? (darkMode ? 'bg-indigo-700 text-white' : 'bg-indigo-600 text-white') : getRecipeCategoryColor(cat, recipeCategories) + ' hover:opacity-80'}`}>
                  {cat} ({count})
                </button>
              );
            })}
          </div>
          {searchedRecipes.length === 0 ? (
            <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <AlertCircle size={48} className="mx-auto mb-3 opacity-50" />
              <p>검색 결과가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {searchedRecipes.map(recipe => (
                <RecipeListItem
                  key={recipe.id}
                  recipe={recipe}
                  darkMode={darkMode}
                  recipeCategories={recipeCategories}
                  copiedRecipeId={copiedRecipeId}
                  onCopyUrl={handleCopyUrl}
                  onEdit={handleEdit}
                  onDelete={onDeleteRecipe}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {customRecipes.length === 0 && !showRecipeForm && (
        <p className={`text-sm text-center py-4 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>아직 등록된 레시피가 없습니다</p>
      )}
    </div>
  );
}

function StatsPanel({ darkMode, categories, categoryStats, totalItems }) {
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [showExpiryStats, setShowExpiryStats] = useState(false);

  const chartData = categories.map((cat, idx) => ({
    name: cat,
    value: categoryStats[cat] || 0,
    color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length]
  })).filter(item => item.value > 0);

  const total = chartData.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = -90;

  const handleMouseMove = (e, category) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setHoveredCategory(category);
  };

  return (
    <div className={`mb-4 p-4 rounded-lg border ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200'}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className={`text-sm font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>📊 카테고리별 통계</h3>
        <button
          onClick={() => setShowExpiryStats(!showExpiryStats)}
          className={`text-xs px-3 py-1 rounded-full transition-colors ${
            showExpiryStats 
              ? (darkMode ? 'bg-orange-700 text-white' : 'bg-orange-600 text-white')
              : (darkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300')
          }`}
        >
          {showExpiryStats ? '전체 보기' : '유통기한 임박'}
        </button>
      </div>
      
      {totalItems > 0 ? (
        <div className="flex flex-col md:flex-row gap-6 items-center">
          {/* 원형 그래프 */}
          <div className="flex-shrink-0 relative">
            <svg 
              width="200" 
              height="200" 
              viewBox="0 0 200 200" 
              className="transform -rotate-90"
              onMouseLeave={() => setHoveredCategory(null)}
            >
              {chartData.map((item, idx) => {
                const percentage = (item.value / total) * 100;
                const angle = (percentage / 100) * 360;
                const startAngle = currentAngle;
                const endAngle = currentAngle + angle;
                
                const startRad = (startAngle * Math.PI) / 180;
                const endRad = (endAngle * Math.PI) / 180;
                const x1 = 100 + 80 * Math.cos(startRad);
                const y1 = 100 + 80 * Math.sin(startRad);
                const x2 = 100 + 80 * Math.cos(endRad);
                const y2 = 100 + 80 * Math.sin(endRad);
                const largeArc = angle > 180 ? 1 : 0;
                
                const path = `M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`;
                
                currentAngle = endAngle;
                
                const colorMatch = item.color.match(/bg-(\w+)-/);
                const colorName = colorMatch ? colorMatch[1] : 'gray';
                const fillColors = {
                  green: '#86efac', red: '#fca5a5', pink: '#f9a8d4', blue: '#93c5fd',
                  purple: '#d8b4fe', yellow: '#fde047', indigo: '#a5b4fc', orange: '#fdba74',
                  teal: '#5eead4', gray: '#d1d5db'
                };
                
                return (
                  <path
                    key={idx}
                    d={path}
                    fill={fillColors[colorName] || fillColors.gray}
                    stroke={darkMode ? '#374151' : '#ffffff'}
                    strokeWidth="2"
                    className="transition-all cursor-pointer"
                    style={{
                      opacity: hoveredCategory === item.name ? 1 : hoveredCategory ? 0.5 : 1,
                      filter: hoveredCategory === item.name ? 'brightness(1.1)' : 'none'
                    }}
                    onMouseMove={(e) => handleMouseMove(e, item.name)}
                  />
                );
              })}
              <circle cx="100" cy="100" r="50" fill={darkMode ? '#1f2937' : '#ffffff'} />
              <text x="100" y="95" textAnchor="middle" className={`text-2xl font-bold ${darkMode ? 'fill-white' : 'fill-gray-800'}`} transform="rotate(90 100 100)">
                {totalItems}
              </text>
              <text x="100" y="115" textAnchor="middle" className={`text-xs ${darkMode ? 'fill-gray-400' : 'fill-gray-600'}`} transform="rotate(90 100 100)">
                전체
              </text>
            </svg>

            {hoveredCategory && (
              <div 
                className={`absolute z-10 px-3 py-2 rounded-lg shadow-lg text-sm pointer-events-none ${
                  darkMode ? 'bg-gray-800 text-white border border-gray-600' : 'bg-white text-gray-800 border border-gray-200'
                }`}
                style={{
                  left: `${tooltipPos.x + 10}px`,
                  top: `${tooltipPos.y - 10}px`,
                  transform: 'translate(0, -100%)'
                }}
              >
                <div className="font-semibold mb-1">{hoveredCategory}</div>
                <div className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                  개수: {categoryStats[hoveredCategory]}개
                </div>
                <div className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                  비율: {Math.round((categoryStats[hoveredCategory] / totalItems) * 100)}%
                </div>
              </div>
            )}
          </div>

          {/* 카테고리 목록 */}
          <div className="flex-1 w-full">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {categories.map(cat => (
                <div key={cat} className={`rounded-lg p-3 shadow-sm border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <div className={`text-xs px-2 py-1 rounded-full inline-block mb-1 ${getCategoryColor(cat, categories)}`}>{cat}</div>
                  <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{categoryStats[cat] || 0}</div>
                  <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{totalItems > 0 ? Math.round(((categoryStats[cat] || 0) / totalItems) * 100) : 0}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <p>식재료를 추가하면 통계가 표시됩니다.</p>
        </div>
      )}
    </div>
  );
}

function RecipeCard({ recipe, items, darkMode, isSelectable, isSelected, onToggleSelect }) {
  const [copiedUrl, setCopiedUrl] = useState(false);

  const handleCopyUrl = () => {
    if (!recipe.url || !navigator.clipboard) return;
    
    navigator.clipboard.writeText(recipe.url).then(() => {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 1000);
    });
  };

  return (
    <div className={`border rounded-lg p-4 hover:shadow-md transition-all ${
      isSelected ? (darkMode ? 'bg-purple-900 border-purple-600' : 'bg-purple-50 border-purple-400') : 
      (darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200')
    }`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              {recipe.name}
            </h3>
            {recipe.url && recipe.url.length > 0 && (
              <button
                onClick={handleCopyUrl}
                className={`inline-flex items-center transition-colors ${
                  copiedUrl 
                    ? 'text-green-600 hover:text-green-800' 
                    : 'text-blue-600 hover:text-blue-800'
                }`}
                title={copiedUrl ? '복사 완료!' : '레시피 링크 복사'}
              >
                {copiedUrl ? <Check size={18} /> : <Link size={18} />}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 mb-2">
            {recipe.recipeCategory && (
              <span className={`text-xs px-2 py-1 rounded-full ${getRecipeCategoryColor(recipe.recipeCategory, DEFAULT_RECIPE_CATEGORIES)}`}>
                {recipe.recipeCategory}
              </span>
            )}
            {recipe.hasUrgent && <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full">유통기한 임박 재료 포함</span>}
          </div>
          <p className={`text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{recipe.description}</p>
          <div className={`flex items-center gap-4 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            <div className="flex items-center gap-1">
              <Clock size={16} />
              <span>{recipe.cookingTime}</span>
            </div>
          </div>
        </div>
        <div className="text-right flex flex-col items-end gap-2">
          <div>
            <div className="text-2xl font-bold text-green-600">{recipe.matchPercentage}%</div>
            <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>재료 일치</div>
          </div>
          {isSelectable && (
            <button
              onClick={() => onToggleSelect(recipe)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                isSelected 
                  ? (darkMode ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-purple-600 hover:bg-purple-700 text-white')
                  : (darkMode ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700')
              }`}>
              {isSelected ? '선택됨 ✓' : '레시피 선택'}
            </button>
          )}
        </div>
      </div>
      <div className={`mt-3 p-3 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
        <div className={`text-sm font-medium mb-2 flex items-center gap-4 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
          <span>필요 재료: {recipe.matchCount}/{recipe.ingredients.length}개 보유</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {recipe.ingredients.map((ing, i) => {
            const has = items.some(item => item.name === ing);
            return (
              <span key={i} className={`text-xs px-2 py-1 rounded-full ${has ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                {ing} {has ? '✓' : '✗'}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ==================== Main Component ====================
export default function FridgeManager() {
  const [categories, setCategories] = useLocalStorage('fridgeCategories', DEFAULT_CATEGORIES);
  const [recipeCategories] = useLocalStorage('recipeCategories', DEFAULT_RECIPE_CATEGORIES);
  const [darkMode, setDarkMode] = useLocalStorage('darkMode', false);

  const { items, addItem, deleteItem, updateItemQuantity } = useItems([]);
  const { recipes: customRecipes, addRecipe, updateRecipe, deleteRecipe, importRecipes } = useRecipes([]);

  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [category, setCategory] = useState(categories[0] || '기타');
  const [showSettings, setShowSettings] = useState(false);
  const [showRecipes, setShowRecipes] = useState(false);
  const [showAllRecipes, setShowAllRecipes] = useState(false);
  const [recipes, setRecipes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expiryFilter, setExpiryFilter] = useState('전체');
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingQuantity, setEditingQuantity] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportData, setExportData] = useState('');
  const [recipeFilter, setRecipeFilter] = useState('전체');
  const [recipeNameSearch, setRecipeNameSearch] = useState('');
  const [allRecipesFilter, setAllRecipesFilter] = useState('전체');
  const [allRecipesSearch, setAllRecipesSearch] = useState('');
  const [selectedRecipes, setSelectedRecipes] = useState([]);
  
  const editInputRef = useRef(null);

  useEffect(() => {
    if (editingItemId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingItemId]);

  const handleAddItem = () => {
    const success = addItem(name, quantity, expiryDate, category);
    if (success) {
      setName('');
      setQuantity('');
      setExpiryDate('');
    } else {
      alert('올바른 날짜를 입력해주세요.');
    }
  };

  const handleQuantityChange = (item, delta) => {
    const { number, unit } = parseQuantity(item.quantity);
    const newNumber = Math.max(0, number + delta);
    const newQuantity = formatQuantity(newNumber, unit);
    updateItemQuantity(item.id, newQuantity);
  };

  const startEditQuantity = (item) => {
    setEditingItemId(item.id);
    setEditingQuantity(item.quantity);
  };

  const saveQuantity = (id, item) => {
    if (item) {
      startEditQuantity(item);
      return;
    }
    const trimmed = editingQuantity.trim();
    if (trimmed) {
      const { number } = parseQuantity(trimmed);
      if (isNaN(number) || number < 0) {
        alert('올바른 수량을 입력해주세요. (예: 2개, 500g, 1.5kg)');
        return;
      }
      updateItemQuantity(id, trimmed);
    }
    setEditingItemId(null);
    setEditingQuantity('');
  };

  const cancelEditQuantity = () => {
    setEditingItemId(null);
    setEditingQuantity('');
  };

  const generateRecipes = () => {
    if (items.length === 0) {
      // 재료가 없어도 전체 레시피 목록 표시
      const allRecipes = [...RECIPE_DB, ...customRecipes].map(r => ({
        ...r,
        matchCount: 0,
        matchPercentage: 0,
        hasUrgent: false
      }));
      setRecipes(allRecipes);
      setRecipeFilter('전체');
      setRecipeNameSearch('');
      setSelectedRecipes([]);
      setShowRecipes(true);
      return;
    }
    
    const ingredients = items.map(i => i.name);
    const urgentItems = items.filter(i => getDaysUntilExpiry(i.expiryDate) <= 3);
    const allRecipes = [...RECIPE_DB, ...customRecipes];
    
    const matched = allRecipes.map(r => {
      const ingredientCount = r.ingredients?.length || 1;
      const matchCount = r.ingredients?.filter(ing => ingredients.includes(ing)).length || 0;
      const hasUrgent = r.ingredients?.some(ing => urgentItems.some(item => item.name === ing)) || false;
      return {
        ...r,
        matchCount,
        matchPercentage: Math.round((matchCount / ingredientCount) * 100),
        hasUrgent
      };
    }).filter(r => r.matchCount > 0).sort((a, b) => {
      if (a.hasUrgent !== b.hasUrgent) return a.hasUrgent ? -1 : 1;
      return b.matchCount - a.matchCount;
    });
    
    setRecipes(matched);
    setRecipeFilter('전체');
    setRecipeNameSearch('');
    setSelectedRecipes([]);
    setShowRecipes(true);
  };

  const toggleRecipeSelection = (recipe) => {
    setSelectedRecipes(prev => {
      const isSelected = prev.some(r => r.id === recipe.id || (r.name === recipe.name && !r.id && !recipe.id));
      if (isSelected) {
        return prev.filter(r => !(r.id === recipe.id || (r.name === recipe.name && !r.id && !recipe.id)));
      } else {
        return [...prev, recipe];
      }
    });
  };

  const isRecipeSelected = (recipe) => {
    return selectedRecipes.some(r => r.id === recipe.id || (r.name === recipe.name && !r.id && !recipe.id));
  };

  const handleAddCategory = (cat) => {
    setCategories([...categories, cat]);
  };

  const handleDeleteCategory = (cat) => {
    if (categories.length > 1) {
      const newCats = categories.filter(c => c !== cat);
      setCategories(newCats);
      if (category === cat) setCategory(newCats[0]);
    }
  };

  const handleExportRecipes = () => {
    setExportData(JSON.stringify(customRecipes, null, 2));
    setShowExportModal(true);
  };

  const handleCopyToClipboard = () => {
    if (!navigator.clipboard) {
      alert('이 브라우저는 클립보드 복사를 지원하지 않습니다.');
      return;
    }
    navigator.clipboard.writeText(exportData).then(() => {
      alert('클립보드에 복사되었습니다!');
      setShowExportModal(false);
    });
  };

  const sortedItems = [...items].sort((a, b) => getDaysUntilExpiry(a.expiryDate) - getDaysUntilExpiry(b.expiryDate));
  
  const filteredItems = sortedItems.filter(item => {
    const match = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (expiryFilter === '전체') return match;
    const days = getDaysUntilExpiry(item.expiryDate);
    if (expiryFilter === '만료') return match && days < 0;
    if (expiryFilter === '3일') return match && days >= 0 && days <= 3;
    if (expiryFilter === '1주일') return match && days >= 0 && days <= 7;
    if (expiryFilter === '1개월') return match && days >= 0 && days <= 30;
    if (expiryFilter === '1개월+') return match && days > 30;
    return match;
  });

  const categoryStats = categories.reduce((acc, cat) => {
    acc[cat] = items.filter(i => i.category === cat).length;
    return acc;
  }, {});

  const expiryStats = {
    '만료': items.filter(i => getDaysUntilExpiry(i.expiryDate) < 0).length,
    '3일 이내': items.filter(i => {
      const days = getDaysUntilExpiry(i.expiryDate);
      return days >= 0 && days <= 3;
    }).length,
    '1주일 이내': items.filter(i => {
      const days = getDaysUntilExpiry(i.expiryDate);
      return days > 3 && days <= 7;
    }).length,
    '1개월 이내': items.filter(i => {
      const days = getDaysUntilExpiry(i.expiryDate);
      return days > 7 && days <= 30;
    }).length,
    '1개월 이상': items.filter(i => getDaysUntilExpiry(i.expiryDate) > 30).length
  };

  return (
    <div className={`min-h-screen p-4 ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-100'}`}>
      {showExportModal && (
        <ExportModal
          darkMode={darkMode}
          exportData={exportData}
          onClose={() => setShowExportModal(false)}
          onCopy={handleCopyToClipboard}
        />
      )}

      <div className="max-w-4xl mx-auto">
        <div className={`rounded-2xl shadow-xl p-6 mb-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex items-center justify-between mb-2">
            <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>🧊 냉장고 식재료 관리</h1>
            <div className="flex gap-2">
              <button onClick={() => setDarkMode(!darkMode)} className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                {darkMode ? <Sun size={24} className="text-yellow-400" /> : <Moon size={24} className="text-gray-600" />}
              </button>
              <button onClick={() => setShowSettings(!showSettings)} className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                <Settings size={24} className={darkMode ? 'text-gray-300' : 'text-gray-600'} />
              </button>
            </div>
          </div>
          <p className={`mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>식재료를 추가하고 유통기한을 관리하세요</p>

          {showSettings ? (
            <div className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
              <CategoryManager
                darkMode={darkMode}
                categories={categories}
                onAddCategory={handleAddCategory}
                onDeleteCategory={handleDeleteCategory}
              />
              <RecipeManager
                darkMode={darkMode}
                recipeCategories={recipeCategories}
                customRecipes={customRecipes}
                onAddRecipe={addRecipe}
                onUpdateRecipe={updateRecipe}
                onDeleteRecipe={deleteRecipe}
                onImportRecipes={importRecipes}
                onExport={handleExportRecipes}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>식재료 이름</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`} placeholder="예: 양파" />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>수량</label>
                  <input type="text" value={quantity} onChange={(e) => setQuantity(e.target.value)}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`} placeholder="예: 2개" />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>유통기한</label>
                  <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>카테고리</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}>
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={handleAddItem} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
                <Plus size={20} />식재료 추가
              </button>
            </div>
          )}
        </div>

        <div className={`rounded-2xl shadow-xl p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>보관 중인 식재료 ({filteredItems.length}개)</h2>
            <div className="flex gap-2">
              <button onClick={() => setShowAllRecipes(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
                <ChefHat size={20} />레시피 탐색
              </button>
              <button onClick={generateRecipes} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
                <ChefHat size={20} />추천 요리
              </button>
            </div>
          </div>

          {items.length > 0 && (
            <>
              <StatsPanel
                darkMode={darkMode}
                categories={categories}
                categoryStats={categoryStats}
                expiryStats={expiryStats}
                totalItems={items.length}
                items={items}
              />

              <div className="mb-4 space-y-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="식재료 검색..."
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                />
                <div>
                  <div className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>유통기한 필터</div>
                  <div className="flex flex-wrap gap-2">
                    {EXPIRY_FILTERS.map(filter => (
                      <button key={filter} onClick={() => setExpiryFilter(filter)}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          expiryFilter === filter ? 'bg-indigo-600 text-white' : (darkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')
                        }`}>
                        {filter === '전체' ? '전체' : filter === '만료' ? '만료됨' : `${filter} 이${filter === '1개월+' ? '상' : '내'}`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {items.length === 0 ? (
            <div className={`text-center py-12 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <AlertCircle size={48} className="mx-auto mb-3 opacity-50" />
              <p>아직 등록된 식재료가 없습니다.</p>
              <p className="text-sm mt-1">위 양식에서 식재료를 추가해보세요!</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className={`text-center py-12 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <AlertCircle size={48} className="mx-auto mb-3 opacity-50" />
              <p>검색 결과가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  darkMode={darkMode}
                  categories={categories}
                  onDelete={deleteItem}
                  onQuantityChange={handleQuantityChange}
                  editingItemId={editingItemId}
                  editingQuantity={editingQuantity}
                  setEditingQuantity={setEditingQuantity}
                  onSaveQuantity={saveQuantity}
                  onCancelEdit={cancelEditQuantity}
                  editInputRef={editInputRef}
                />
              ))}
            </div>
          )}
        </div>

        {showRecipes && (
          <div className={`rounded-2xl shadow-xl p-6 mt-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>🍳 추천 요리</h2>
              <button onClick={() => setShowRecipes(false)} className={darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}>
                <X size={24} />
              </button>
            </div>
            
            {recipes.length > 0 && (
              <>
                <div className="mb-4">
                  <input
                    type="text"
                    value={recipeNameSearch}
                    onChange={(e) => setRecipeNameSearch(e.target.value)}
                    placeholder="레시피 이름으로 검색..."
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'}`}
                  />
                </div>
                
                <div className="mb-4">
                  <div className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>레시피 카테고리</div>
                  <div className="flex flex-wrap gap-2">
                    <button 
                      onClick={() => setRecipeFilter('전체')}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        recipeFilter === '전체' 
                          ? (darkMode ? 'bg-green-700 text-white' : 'bg-green-600 text-white')
                          : (darkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')
                      }`}>
                      전체 ({recipes.filter(r => 
                        r.name.toLowerCase().includes(recipeNameSearch.toLowerCase()) || 
                        r.description.toLowerCase().includes(recipeNameSearch.toLowerCase())
                      ).length})
                    </button>
                    {DEFAULT_RECIPE_CATEGORIES.map(cat => {
                      const count = recipes.filter(r => 
                        (r.recipeCategory || '기타') === cat &&
                        (r.name.toLowerCase().includes(recipeNameSearch.toLowerCase()) || 
                         r.description.toLowerCase().includes(recipeNameSearch.toLowerCase()))
                      ).length;
                      if (count === 0) return null;
                      return (
                        <button 
                          key={cat}
                          onClick={() => setRecipeFilter(cat)}
                          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                            recipeFilter === cat 
                              ? (darkMode ? 'bg-green-700 text-white' : 'bg-green-600 text-white')
                              : getRecipeCategoryColor(cat, DEFAULT_RECIPE_CATEGORIES) + ' hover:opacity-80'
                          }`}>
                          {cat} ({count})
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedRecipes.length > 0 && (
                  <div className={`mb-4 p-4 rounded-lg border ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-blue-50 border-blue-200'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                        🛒 장보기 체크리스트 ({selectedRecipes.length}개 레시피 선택됨)
                      </h3>
                      <button 
                        onClick={() => setSelectedRecipes([])}
                        className={`text-sm px-3 py-1 rounded-lg transition-colors ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}>
                        선택 초기화
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      {selectedRecipes.map((recipe, idx) => {
                        const hasIngredients = recipe.ingredients?.filter(ing => items.some(item => item.name === ing)) || [];
                        const needIngredients = recipe.ingredients?.filter(ing => !items.some(item => item.name === ing)) || [];
                        
                        return (
                          <div key={idx} className={`p-3 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'}`}>
                            <h4 className={`font-bold text-lg mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                              📌 {recipe.name}
                            </h4>
                            
                            {hasIngredients.length > 0 && (
                              <div className="mb-2">
                                <div className={`text-sm font-medium mb-1 ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                                  ✅ 보유한 재료 ({hasIngredients.length}개):
                                </div>
                                <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                  {hasIngredients.join(', ')}
                                </div>
                              </div>
                            )}
                            
                            {needIngredients.length > 0 && (
                              <div>
                                <div className={`text-sm font-medium mb-1 ${darkMode ? 'text-orange-400' : 'text-orange-700'}`}>
                                  🛒 구매 필요 ({needIngredients.length}개):
                                </div>
                                <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                  {needIngredients.join(', ')}
                                </div>
                              </div>
                            )}
                            
                            {needIngredients.length === 0 && (
                              <div className={`text-sm font-medium ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                                🎉 모든 재료를 보유하고 있습니다!
                              </div>
                            )}
                          </div>
                        );
                      })}
                      
                      <div className={`p-3 rounded-lg border-2 border-dashed ${darkMode ? 'bg-gray-800 border-purple-600' : 'bg-purple-50 border-purple-400'}`}>
                        <h4 className={`font-bold text-base mb-2 ${darkMode ? 'text-purple-400' : 'text-purple-700'}`}>
                          📋 통합 장보기 목록
                        </h4>
                        <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {(() => {
                            const allNeededIngredients = new Set();
                            selectedRecipes.forEach(recipe => {
                              recipe.ingredients?.forEach(ing => {
                                if (!items.some(item => item.name === ing)) {
                                  allNeededIngredients.add(ing);
                                }
                              });
                            });
                            return allNeededIngredients.size > 0 
                              ? Array.from(allNeededIngredients).join(', ')
                              : '구매할 재료가 없습니다!';
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            
            {recipes.length === 0 ? (
              <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <p>레시피가 없습니다.</p>
              </div>
            ) : (
              (() => {
                const filteredRecipes = recipes
                  .filter(recipe => recipeFilter === '전체' || (recipe.recipeCategory || '기타') === recipeFilter)
                  .filter(recipe => 
                    recipe.name.toLowerCase().includes(recipeNameSearch.toLowerCase()) || 
                    recipe.description.toLowerCase().includes(recipeNameSearch.toLowerCase())
                  );
                
                return filteredRecipes.length === 0 ? (
                  <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <AlertCircle size={48} className="mx-auto mb-3 opacity-50" />
                    <p>검색 결과가 없습니다.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredRecipes.map((recipe, idx) => (
                      <RecipeCard 
                        key={recipe.id || idx} 
                        recipe={recipe} 
                        items={items} 
                        darkMode={darkMode}
                        isSelectable={true}
                        isSelected={isRecipeSelected(recipe)}
                        onToggleSelect={toggleRecipeSelection}
                      />
                    ))}
                  </div>
                );
              })()
            )}
          </div>
        )}

        {showAllRecipes && (
          <div className={`rounded-2xl shadow-xl p-6 mt-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>📚 전체 레시피 탐색</h2>
              <button onClick={() => setShowAllRecipes(false)} className={darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}>
                <X size={24} />
              </button>
            </div>

            <div className="mb-4">
              <input
                type="text"
                value={allRecipesSearch}
                onChange={(e) => setAllRecipesSearch(e.target.value)}
                placeholder="레시피 이름이나 재료로 검색..."
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'}`}
              />
            </div>

            <div className="mb-4">
              <div className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>레시피 카테고리</div>
              <div className="flex flex-wrap gap-2">
                {(() => {
                  const allRecipesList = [...RECIPE_DB, ...customRecipes];
                  const searchFilteredRecipes = allRecipesList.filter(r =>
                    r.name.toLowerCase().includes(allRecipesSearch.toLowerCase()) ||
                    r.description.toLowerCase().includes(allRecipesSearch.toLowerCase()) ||
                    r.ingredients?.some(ing => ing.toLowerCase().includes(allRecipesSearch.toLowerCase()))
                  );

                  return (
                    <>
                      <button 
                        onClick={() => setAllRecipesFilter('전체')}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          allRecipesFilter === '전체' 
                            ? (darkMode ? 'bg-purple-700 text-white' : 'bg-purple-600 text-white')
                            : (darkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')
                        }`}>
                        전체 ({searchFilteredRecipes.length})
                      </button>
                      {DEFAULT_RECIPE_CATEGORIES.map(cat => {
                        const count = searchFilteredRecipes.filter(r => (r.recipeCategory || '기타') === cat).length;
                        if (count === 0) return null;
                        return (
                          <button 
                            key={cat}
                            onClick={() => setAllRecipesFilter(cat)}
                            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                              allRecipesFilter === cat 
                                ? (darkMode ? 'bg-purple-700 text-white' : 'bg-purple-600 text-white')
                                : getRecipeCategoryColor(cat, DEFAULT_RECIPE_CATEGORIES) + ' hover:opacity-80'
                            }`}>
                            {cat} ({count})
                          </button>
                        );
                      })}
                    </>
                  );
                })()}
              </div>
            </div>

            {(() => {
              const allRecipesList = [...RECIPE_DB, ...customRecipes];
              const filteredRecipes = allRecipesList
                .filter(r =>
                  r.name.toLowerCase().includes(allRecipesSearch.toLowerCase()) ||
                  r.description.toLowerCase().includes(allRecipesSearch.toLowerCase()) ||
                  r.ingredients?.some(ing => ing.toLowerCase().includes(allRecipesSearch.toLowerCase()))
                )
                .filter(r => allRecipesFilter === '전체' || (r.recipeCategory || '기타') === allRecipesFilter)
                .map(r => {
                  const ingredientCount = r.ingredients?.length || 1;
                  const matchCount = items.length > 0 ? r.ingredients?.filter(ing => items.some(item => item.name === ing)).length || 0 : 0;
                  return {
                    ...r,
                    matchCount,
                    matchPercentage: Math.round((matchCount / ingredientCount) * 100),
                    hasUrgent: false
                  };
                });

              return filteredRecipes.length === 0 ? (
                <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <AlertCircle size={48} className="mx-auto mb-3 opacity-50" />
                  <p>검색 결과가 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredRecipes.map((recipe, idx) => (
                    <RecipeCard 
                      key={recipe.id || `recipe-${idx}`} 
                      recipe={recipe} 
                      items={items} 
                      darkMode={darkMode}
                    />
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}