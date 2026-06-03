package com.digitalwallet.mapper;

import com.digitalwallet.model.User;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface UserMapper {
    void insert(User user);
    User findByUsername(@Param("username") String username);

    User findById(@Param("id") Long id);

    List<User> findAllWithPagination(@Param("search") String search, @Param("offset") int offset, @Param("limit") int limit);

    int countAll(@Param("search") String search);

    int updateRole(@Param("id") Long id, @Param("role") String role);
}
