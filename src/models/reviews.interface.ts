/**
 * DTO для создания отзыва пользователя
 */
export interface UserReviewsCreateDTO {
  /** Оценка (1-5) */
  rate: number;
  /** Достоинства */
  advantages?: string;
  /** Недостатки */
  disadvantages?: string;
  /** Сообщение отзыва */
  requestMessage: FeedBackMessageCreateDTO;
  /** ID товара */
  productId: string;
}

/**
 * DTO для сообщения отзыва
 */
export interface FeedBackMessageCreateDTO {
  /** Дата и время создания сообщения */
  dateTime: string;
  /** Текст сообщения */
  text: string;
  /** ID вопроса (опционально) */
  userQuestoinId?: string;
  /** ID пользователя (опционально) */
  userInstanceId?: string;
  /** Анонимность */
  isAnonymous: boolean;
}

/**
 * DTO одного отзыва пользователя
 */
export interface UserReviewsDto {
  id: string;
  rate: number;
  advantages?: string;
  disadvantages?: string;
  product: {
    id: string;
    article: string;
    fullName: string;
    productImageLink: string;
  };
  requestMessage: {
    id: string;
    text: string;
    dateTime: string;
    likeCount: number;
    dislikeCount: number;
    rateValue: number | null;
    userInstance?: any;
    isAnonymous?: boolean;
  };
  responseMessage?: {
    id: string;
    text: string;
    dateTime: string;
  };
}

/**
 * DTO для запроса фильтрации (пагинация, сортировка, фильтры)
 */
export interface ReviewsQueryDto {
  filters?: Array<{ field: string; values: string[]; type: number }>;
  sorts?: Array<{ field: string; sortType: number }>;
  page: number;
  pageSize: number;
}