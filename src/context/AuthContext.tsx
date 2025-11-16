// src/context/AuthContext.tsx

import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

// Тип користувача, який ми отримуємо з Firebase
type User = FirebaseAuthTypes.User | null;

// Що наш Контекст буде надавати
interface IAuthContext {
    user: User;
    isLoading: boolean;
}

// Створюємо сам контекст
export const AuthContext = createContext<IAuthContext>({
    user: null,
    isLoading: true,
});

// Створюємо "Провайдера" - компонент, який буде "огортати" наш додаток
// і стежити за станом входу
interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Ця функція буде викликатися, коли користувач входить або виходить
    function onAuthStateChanged(user: User) {
        setUser(user);
        if (isLoading) {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        // Підписуємося на зміни стану аутентифікації Firebase
        // Ця функція повертає "відписку", яка спрацює, коли компонент буде видалено
        const subscriber = auth().onAuthStateChanged(onAuthStateChanged);

        // Відписуємося при виході
        return subscriber;
    }, []);

    // Надаємо 'user' та 'isLoading' усім дочірнім компонентам
    return (
        <AuthContext.Provider value={{ user, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};
